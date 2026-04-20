import { Router } from 'express';
import { login, register, syncGoogleUser, checkUsername, logout, refresh } from '../controllers/authController.js';
import { ref } from 'process';

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
// POST /api/auth/logout
router.post('/logout', logout);
// POST /api/auth/refresh
router.post('/refresh', refresh);

export default router;