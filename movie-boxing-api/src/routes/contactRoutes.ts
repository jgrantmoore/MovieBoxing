import { Router } from 'express';
import { 
    createContactRequest,

} from '../controllers/contactController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// /api/contact/create
router.post('/create', authenticateToken, createContactRequest);



export default router;