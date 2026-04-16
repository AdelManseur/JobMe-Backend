"""
Face Verification Service  v3.0.0
==================================
Multi-selfie, production-ready KYC pipeline built on InsightFace + FastAPI.

Key improvements over v2:
  • 2-5 selfies per request with confidence-weighted embedding aggregation
  • CPU-heavy work offloaded to a thread-pool (non-blocking event loop)
  • Blur / face-size heuristics for image quality gating
  • Per-selfie diagnostics in the response
  • Structured logging with Prometheus-ready counter stubs
  • Anti-spoofing extension point (design notes inline)
"""

from __future__ import annotations

import asyncio
import logging
import subprocess
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Annotated

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from insightface.app import FaceAnalysis

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("face_verification")


# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────
class Config:
    # Matching
    THRESHOLD: float = 0.50
    HIGH_CONFIDENCE_THRESHOLD: float = 0.70

    # File validation
    MAX_FILE_SIZE_MB: int = 10
    MIN_SELFIES: int = 2
    MAX_SELFIES: int = 5
    ALLOWED_CONTENT_TYPES: frozenset[str] = frozenset(
        {"image/jpeg", "image/png", "image/webp"}
    )

    # Face quality gates
    MIN_FACE_CONFIDENCE: float = 0.60   # InsightFace det_score
    MIN_FACE_SIZE_PX: int = 60          # shorter side of bounding box
    # IDs are often photos of printed cards with low texture, so they need a
    # lower blur gate than live selfies.
    ID_BLUR_LAPLACIAN_THRESHOLD: float = 25.0
    SELFIE_BLUR_LAPLACIAN_THRESHOLD: float = 60.0

    # Aggregation
    USE_WEIGHTED_AGGREGATION: bool = True


# ──────────────────────────────────────────────────────────────────────────────
# Enums / value objects
# ──────────────────────────────────────────────────────────────────────────────
class MatchConfidence(str, Enum):
    HIGH   = "high"    # similarity >= 0.70
    MEDIUM = "medium"  # 0.50 – 0.70
    LOW    = "low"     # < 0.50


class RejectionReason(str, Enum):
    LOW_CONFIDENCE   = "low_face_confidence"
    MULTIPLE_FACES   = "multiple_faces"
    FACE_TOO_SMALL   = "face_too_small"
    BLURRY           = "blurry_image"
    NO_FACE          = "no_face_detected"
    DECODE_ERROR     = "decode_error"


# ──────────────────────────────────────────────────────────────────────────────
# Application state
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class AppState:
    face_analyzer: FaceAnalysis
    device: str
    # Lightweight metrics counters (swap for prometheus_client.Counter in prod)
    requests_total: int = 0
    requests_matched: int = 0
    requests_failed: int = 0


app_state: AppState | None = None


def _get_gpu_name() -> str:
    try:
        return subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], text=True
        ).strip()
    except Exception:
        return "Unknown NVIDIA GPU"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global app_state
    logger.info("Loading FaceAnalysis model …")
    analyzer = FaceAnalysis(
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
    )
    try:
        analyzer.prepare(ctx_id=0, det_size=(640, 640))
        device = f"GPU ({_get_gpu_name()})"
    except Exception:
        analyzer.prepare(ctx_id=-1, det_size=(640, 640))
        device = "CPU"

    app_state = AppState(face_analyzer=analyzer, device=device)
    logger.info("Model ready on %s", device)
    yield
    logger.info("Shutdown complete.")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Face Verification Service",
    version="3.0.0",
    description="Multi-selfie identity verification using InsightFace embeddings.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def _http_exc_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


# ──────────────────────────────────────────────────────────────────────────────
# I/O helpers  (async-safe)
# ──────────────────────────────────────────────────────────────────────────────
async def _read_upload(file: UploadFile, label: str) -> bytes:
    """Validate content-type + size, then return raw bytes."""
    if file.content_type not in Config.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"{label}: unsupported type '{file.content_type}'. "
                f"Allowed: {sorted(Config.ALLOWED_CONTENT_TYPES)}"
            ),
        )
    data = await file.read()
    size_mb = len(data) / (1024 ** 2)
    if size_mb > Config.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds {Config.MAX_FILE_SIZE_MB} MB limit ({size_mb:.1f} MB)",
        )
    return data


def _decode_image(raw: bytes, label: str) -> np.ndarray:
    """Decode bytes → BGR ndarray; raises 400 on failure."""
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail=f"{label}: could not decode image")
    return img


# ──────────────────────────────────────────────────────────────────────────────
# Image quality heuristics
# ──────────────────────────────────────────────────────────────────────────────
def _laplacian_variance(gray: np.ndarray) -> float:
    """Higher = sharper.  Cheap O(n) blur estimator."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _face_box_size(face) -> int:
    """Shorter side of the detected bounding box in pixels."""
    x1, y1, x2, y2 = face.bbox.astype(int)
    return int(min(abs(x2 - x1), abs(y2 - y1)))


# ──────────────────────────────────────────────────────────────────────────────
# Core face extraction  (CPU-heavy → must run in thread pool)
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class FaceResult:
    embedding: np.ndarray
    det_score: float
    accepted: bool
    rejection_reason: str | None = None
    blur_score: float | None = None
    face_size_px: int | None = None


def _extract_face_sync(image: np.ndarray, label: str, allow_multi: bool = False) -> FaceResult:
    """
    Synchronous face extraction — call via run_in_executor.

    allow_multi=False  → rejects images with >1 face (strict KYC mode).
    allow_multi=True   → picks highest-confidence face with a warning.
    """
    faces = app_state.face_analyzer.get(image)

    if not faces:
        return FaceResult(
            embedding=np.zeros(1),
            det_score=0.0,
            accepted=False,
            rejection_reason=RejectionReason.NO_FACE,
            blur_score=None,
        )

    if len(faces) > 1 and not allow_multi:
        return FaceResult(
            embedding=np.zeros(1),
            det_score=0.0,
            accepted=False,
            rejection_reason=RejectionReason.MULTIPLE_FACES,
            blur_score=None,
        )

    best = max(faces, key=lambda f: f.det_score)

    if best.det_score < Config.MIN_FACE_CONFIDENCE:
        return FaceResult(
            embedding=np.zeros(1),
            det_score=float(best.det_score),
            accepted=False,
            rejection_reason=RejectionReason.LOW_CONFIDENCE,
            blur_score=None,
        )

    size = _face_box_size(best)
    if size < Config.MIN_FACE_SIZE_PX:
        return FaceResult(
            embedding=np.zeros(1),
            det_score=float(best.det_score),
            accepted=False,
            rejection_reason=RejectionReason.FACE_TOO_SMALL,
            blur_score=None,
            face_size_px=int(size),
        )

    # Blur on the detected face crop is more reliable than full-frame blur.
    h, w = image.shape[:2]
    x1, y1, x2, y2 = best.bbox.astype(int)
    x1 = max(0, min(x1, w - 1))
    x2 = max(0, min(x2, w))
    y1 = max(0, min(y1, h - 1))
    y2 = max(0, min(y2, h))

    face_crop = image[y1:y2, x1:x2]
    if face_crop.size == 0:
        face_crop = image

    blur = _laplacian_variance(cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY))
    blur_threshold = (
        Config.ID_BLUR_LAPLACIAN_THRESHOLD
        if label == "id_image"
        else Config.SELFIE_BLUR_LAPLACIAN_THRESHOLD
    )
    if blur < blur_threshold:
        return FaceResult(
            embedding=np.zeros(1),
            det_score=float(best.det_score),
            accepted=False,
            rejection_reason=RejectionReason.BLURRY,
            blur_score=round(blur, 2),
            face_size_px=int(size),
        )

    if len(faces) > 1:
        logger.warning("%s: %d faces detected — using highest-confidence one.", label, len(faces))

    return FaceResult(
        embedding=best.embedding.copy(),
        det_score=float(best.det_score),
        accepted=True,
        blur_score=round(blur, 2),
        face_size_px=int(size),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Embedding aggregation
# ──────────────────────────────────────────────────────────────────────────────
def _aggregate_embeddings(
    results: list[FaceResult],
    weighted: bool = True,
) -> np.ndarray:
    """
    Weighted or simple mean of accepted embeddings, L2-normalised.

    Weighted mode: each embedding is scaled by its det_score before averaging.
    This gives higher-confidence frames more influence — reduces noise from
    partially-occluded or motion-blurred frames that still pass the threshold.
    """
    accepted = [r for r in results if r.accepted]
    if not accepted:
        raise HTTPException(
            status_code=400,
            detail="No valid selfie frames — all selfies were rejected by quality checks.",
        )

    embeddings = np.stack([r.embedding for r in accepted])  # (N, D)

    if weighted and len(accepted) > 1:
        scores = np.array([r.det_score for r in accepted], dtype=np.float64)
        weights = scores / scores.sum()                     # normalised weights
        agg = (embeddings * weights[:, None]).sum(axis=0)
    else:
        agg = embeddings.mean(axis=0)

    # L2-normalise for stable cosine similarity
    norm = np.linalg.norm(agg)
    if norm == 0.0:
        raise HTTPException(status_code=400, detail="Aggregated embedding is a zero vector.")
    return agg / norm


# ──────────────────────────────────────────────────────────────────────────────
# Similarity & confidence
# ──────────────────────────────────────────────────────────────────────────────
def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Both vectors assumed L2-normalised → dot product suffices."""
    return float(np.dot(a, b))


def _score_to_confidence(sim: float) -> MatchConfidence:
    if sim >= Config.HIGH_CONFIDENCE_THRESHOLD:
        return MatchConfidence.HIGH
    if sim >= Config.THRESHOLD:
        return MatchConfidence.MEDIUM
    return MatchConfidence.LOW


def _confidence_explanation(sim: float, n_accepted: int, n_total: int) -> str:
    conf = _score_to_confidence(sim)
    base = {
        MatchConfidence.HIGH:   "Strong biometric match across selfie frames.",
        MatchConfidence.MEDIUM: "Probable match; consider liveness or additional verification.",
        MatchConfidence.LOW:    "Weak or no biometric match detected.",
    }[conf]
    if n_accepted < n_total:
        base += f" ({n_total - n_accepted}/{n_total} selfie(s) rejected by quality checks.)"
    return base


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    if not app_state:
        raise HTTPException(status_code=503, detail="Model not loaded yet.")
    return {
        "status": "ok",
        "device": app_state.device,
        "threshold": Config.THRESHOLD,
        "metrics": {
            "requests_total":   app_state.requests_total,
            "requests_matched": app_state.requests_matched,
            "requests_failed":  app_state.requests_failed,
        },
    }


@app.post("/compare")
async def compare(
    id_image: Annotated[UploadFile, File(description="Government-issued photo ID")],
    selfies:  Annotated[
        list[UploadFile],
        File(description="2–5 live selfie frames"),
    ],
):
    """
    Compare an ID photo against 2-5 selfie frames.

    Anti-spoofing extension point
    ─────────────────────────────
    Insert a `_liveness_check(image) -> bool` call inside the per-selfie loop
    below before calling `_extract_face_sync`.  Real-world options:
      • Silent liveness: FAS model (e.g. Silent-Face-Anti-Spoofing) checks
        for print/replay artefacts.
      • Active liveness: challenge-response (blink / turn head) validated
        server-side before this endpoint is reached.
      • Depth map: if device provides IR/depth data, forward as extra field.
    """
    t0 = time.perf_counter()
    assert app_state, "Model not initialised"
    app_state.requests_total += 1

    # ── 1. Selfie count gate ──────────────────────────────────────────────────
    n_selfies = len(selfies)
    if not (Config.MIN_SELFIES <= n_selfies <= Config.MAX_SELFIES):
        raise HTTPException(
            status_code=422,
            detail=f"Provide {Config.MIN_SELFIES}–{Config.MAX_SELFIES} selfies; got {n_selfies}.",
        )

    # ── 2. Read all uploads concurrently ─────────────────────────────────────
    id_bytes, *selfie_bytes_list = await asyncio.gather(
        _read_upload(id_image, "id_image"),
        *[_read_upload(s, f"selfie_{i+1}") for i, s in enumerate(selfies)],
    )

    # ── 3. Decode images (cheap, stays in event loop) ─────────────────────────
    id_img = _decode_image(id_bytes, "id_image")
    selfie_imgs = [
        _decode_image(b, f"selfie_{i+1}") for i, b in enumerate(selfie_bytes_list)
    ]

    # ── 4. Offload CPU-heavy inference to thread pool ─────────────────────────
    loop = asyncio.get_running_loop()

    id_result, *selfie_results = await asyncio.gather(
        loop.run_in_executor(None, _extract_face_sync, id_img, "id_image", False),
        *[
            loop.run_in_executor(None, _extract_face_sync, img, f"selfie_{i+1}", False)
            for i, img in enumerate(selfie_imgs)
        ],
    )

    # ── 5. Gate on ID image quality ───────────────────────────────────────────
    if not id_result.accepted:
        app_state.requests_failed += 1
        reason = (
            id_result.rejection_reason.value
            if isinstance(id_result.rejection_reason, Enum)
            else id_result.rejection_reason
        )
        raise HTTPException(
            status_code=400,
            detail=(
                f"id_image rejected: {reason}"
                + (
                    f" (blur={id_result.blur_score}, min={Config.ID_BLUR_LAPLACIAN_THRESHOLD})"
                    if id_result.blur_score is not None and reason == RejectionReason.BLURRY.value
                    else ""
                )
            ),
        )

    # L2-normalise the ID embedding once
    id_norm = np.linalg.norm(id_result.embedding)
    id_emb  = id_result.embedding / id_norm

    # ── 6. Aggregate selfie embeddings ────────────────────────────────────────
    agg_emb = _aggregate_embeddings(selfie_results, weighted=Config.USE_WEIGHTED_AGGREGATION)

    # ── 7. Compute similarity & verdict ──────────────────────────────────────
    similarity = _cosine_similarity(id_emb, agg_emb)
    match      = similarity >= Config.THRESHOLD
    confidence = _score_to_confidence(similarity)

    n_accepted = sum(1 for r in selfie_results if r.accepted)

    if match:
        app_state.requests_matched += 1
    else:
        app_state.requests_failed += 1

    elapsed = round(time.perf_counter() - t0, 3)
    logger.info(
        "compare | match=%s conf=%s sim=%.4f accepted=%d/%d elapsed=%ss device=%s",
        match, confidence.value, similarity, n_accepted, n_selfies, elapsed, app_state.device,
    )

    # ── 8. Build response ─────────────────────────────────────────────────────
    selfie_diagnostics = [
        {
            "index":            i + 1,
            "accepted":         r.accepted,
            "det_score":        round(r.det_score, 4) if r.accepted else None,
            "blur_score":       r.blur_score,
            "face_size_px":     int(r.face_size_px) if r.face_size_px is not None else None,
            "rejection_reason": (
                r.rejection_reason.value
                if isinstance(r.rejection_reason, Enum)
                else r.rejection_reason
            ),
        }
        for i, r in enumerate(selfie_results)
    ]

    return {
        "match":       match,
        "confidence":  confidence.value,
        "similarity":  round(similarity, 4),
        "threshold":   Config.THRESHOLD,
        "explanation": _confidence_explanation(similarity, n_accepted, n_selfies),
        "selfie_diagnostics": selfie_diagnostics,
        "details": {
            "id_face_score":        round(id_result.det_score, 4),
            "id_blur_score":        id_result.blur_score,
            "selfies_accepted":     n_accepted,
            "selfies_total":        n_selfies,
            "aggregation_strategy": "weighted_mean" if Config.USE_WEIGHTED_AGGREGATION else "mean",
            "processing_time_s":    elapsed,
            "device":               app_state.device,
        },
    }