import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // If there's no token, just move on to the controller.
    // req.user will be undefined.
    if (!token) {
        return next();
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET is missing from environment variables.");
            return next(); 
        }

        const decoded = jwt.verify(token, secret) as { userId: number };
        
        // Attach the user info if valid
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        // Even if the token is invalid (expired/tampered), we just proceed.
        // We log the error for debugging but don't block the user.
        console.warn("Invalid token provided, proceeding as guest.");
        next();
    }
};

// Add this to src/middleware/auth.ts
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required." });
    }
    next();
};