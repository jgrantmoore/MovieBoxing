import { Router } from 'express';
import { createTrade,
    acceptTrade,
    denyTrade,
    getPendingTrades,
    getTradeHistory
} from '../controllers/tradeController.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// /api/trades/create
router.post('/create', authenticateToken, requireAuth, createTrade);
// /api/trades/accept
router.post('/accept', authenticateToken, requireAuth, acceptTrade);
// /api/trades/deny
router.post('/deny', authenticateToken, requireAuth, denyTrade);
// /api/trades/pending
router.get('/pending', authenticateToken, requireAuth, getPendingTrades);
// /api/trades/history
router.get('/history', getTradeHistory);

export default router;