import { Router } from 'express';
import { 
    getTopPerformingMovies,
    getUser,
    getUserStats,
    updateUser
} from '../controllers/userController.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/user/top-performing-movies?id=123
router.get('/top-performing-movies', authenticateToken, getTopPerformingMovies);
// GET /api/user?id=123
router.get('/', authenticateToken, getUser);
// GET /api/user/stats?id=123
router.get('/stats', authenticateToken, getUserStats);
// PUT /api/user/update
router.put('/update', authenticateToken, requireAuth, updateUser);

export default router;