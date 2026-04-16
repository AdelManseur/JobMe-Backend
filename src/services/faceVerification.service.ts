export interface FaceVerificationResult {
  match: boolean;
  confidence: "high" | "medium" | "low";
  similarity: number;
  threshold: number;
  explanation: string;
  selfie_diagnostics?: Array<{
    index: number;
    accepted: boolean;
    det_score: number | null;
    blur_score: number | null;
    face_size_px: number | null;
    rejection_reason: string | null;
  }>;
}

const FACE_SERVICE_URL = "http://localhost:8000/compare";

export const verifyFaceWithInsightService = async (
  idImage: Express.Multer.File,
  selfies: Express.Multer.File[]
): Promise<FaceVerificationResult> => {
  if (selfies.length < 2 || selfies.length > 5) {
    throw new Error(`Face verification requires 2-5 selfies, received ${selfies.length}`);
  }

  const formData = new FormData();
  const idImageBytes = Uint8Array.from(idImage.buffer);

  formData.append(
    "id_image",
    new Blob([idImageBytes], {
      type: idImage.mimetype || "application/octet-stream",
    }),
    idImage.originalname || "id-image.jpg"
  );

  for (const selfie of selfies) {
    const selfieBytes = Uint8Array.from(selfie.buffer);
    formData.append(
      "selfies",
      new Blob([selfieBytes], {
        type: selfie.mimetype || "application/octet-stream",
      }),
      selfie.originalname || "selfie.jpg"
    );
  }

  const response = await fetch(FACE_SERVICE_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Face service request failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as Partial<FaceVerificationResult>;

  if (
    typeof data.similarity !== "number" ||
    typeof data.match !== "boolean" ||
    typeof data.threshold !== "number" ||
    typeof data.confidence !== "string" ||
    typeof data.explanation !== "string"
  ) {
    throw new Error("Invalid response from face verification service");
  }

  return {
    match: data.match,
    confidence: data.confidence,
    similarity: data.similarity,
    threshold: data.threshold,
    explanation: data.explanation,
    selfie_diagnostics: data.selfie_diagnostics,
  };
};