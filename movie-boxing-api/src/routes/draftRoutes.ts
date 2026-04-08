import { Router } from 'express';
import { 
    pickMovie,
    startDraft,
    updateDraftOrder
} from '../controllers/draftController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// /api/drafts/new
router.post('/pick', authenticateToken, pickMovie);
// /api/drafts/start?id=1
router.post('/start', authenticateToken, startDraft);
// /api/drafts/update-order?id=1
//router.post('/update-order', authenticateToken, updateDraftOrder);


export default router;