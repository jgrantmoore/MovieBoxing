import { Router } from 'express';
import { login, register, syncGoogleUser, checkUsername } from '../controllers/authController.js';

const router = Router();

// Health check route (The "Arena is Ready" replacement)
router.get('/login', (req, res) => res.status(200).send("Arena is Ready."));

// POST /api/auth/login
router.post('/login', login);
// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/sync-google
router.post('/sync-google', syncGoogleUser);
// POST /api/auth/check-username
router.post('/check-username', checkUsername);

export default router;