
import { Router } from 'express';
import { upload, uploadImage } from '../controllers/upload.controller';

const router = Router();

router.post('/', upload.single('image'), uploadImage);

export default router;