import { Router } from 'express';
import { createLeague, 
    deleteLeague, 
    getLeaderboard, 
    getLeague, 
    getLeagueInfo, 
    getLeagueReleaseOrder,
    getMyLeagues,
    searchLeagues,
    updateLeague
} from '../controllers/leagueController.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// /api/leagues/create
router.post('/create', authenticateToken, requireAuth, createLeague);
// /api/leagues/delete?id=X (DELETE)
router.delete('/delete', authenticateToken, requireAuth, deleteLeague);
// /api/leagues/leaderboard?id=X
router.get('/leaderboard', getLeaderboard);
// /api/leagues/?id=X
router.get('/', authenticateToken, getLeague);
// /api/leagues/info?id=X
router.get('/info', getLeagueInfo);
// /api/leagues/release-order?id=X
router.get('/release-order', getLeagueReleaseOrder);
// /api/leagues/my
router.get('/my', authenticateToken, requireAuth, getMyLeagues);
// /api/leagues/search?query=X
router.get('/search', authenticateToken, searchLeagues);
// /api/leagues/update?id=X
router.put('/update', authenticateToken, requireAuth, updateLeague);


export default router;