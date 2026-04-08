import { Router } from 'express';
import { 
    assignMovie,
    createTeam,
    deleteTeam,
    getUserTeamsAndPicks,
    getTeamsByUserId,
    replaceMovie,
    swapMovies,
    updateTeam,
    clearRosterSlot
} from '../controllers/teamControllers.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/teams/assign-movie
router.post('/assign-movie', authenticateToken, requireAuth, assignMovie);
// POST /api/teams/create
router.post('/create', authenticateToken, requireAuth, createTeam);
// DELETE /api/teams/delete?id=X
router.delete('/delete', authenticateToken, requireAuth, deleteTeam);
// GET /api/teams/my-teams
router.get('/my-teams', authenticateToken, requireAuth, getUserTeamsAndPicks);
// GET /api/teams/profile?userId=123
router.get('/profile', authenticateToken, getTeamsByUserId);
// POST /api/teams/replace
router.post('/replace', authenticateToken, replaceMovie);
// POST /api/teams/swap
router.post('/swap', authenticateToken, swapMovies);
// PUT /api/teams/update?id=X
router.put('/update', authenticateToken, requireAuth, updateTeam);
// DELETE /api/teams/clear-slot?id=X
router.delete('/clear-slot', authenticateToken, requireAuth, clearRosterSlot);

export default router;