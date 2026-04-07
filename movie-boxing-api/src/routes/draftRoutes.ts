import { Router } from 'express';
import { pickMovie } from '../controllers/draftController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/new', authenticateToken, pickMovie);

export default router;