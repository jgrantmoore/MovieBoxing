import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * ATTEMPT AUTH: Decodes token if present, but doesn't block.
 * Use this for "Mixed" routes like getLeague.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // Proceed as Guest
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("CRITICAL: JWT_SECRET missing.");
            return res.status(500).send("Server configuration error.");
        }

        const decoded = jwt.verify(token, secret) as { userId: number };
        
        // Use Number() to prevent casing/type issues during database comparisons
        req.user = { userId: Number(decoded.userId) };
        next();
    } catch (error: any) {
        // If the token is EXPIRED, we must return 401. 
        // This triggers your apiRequest helper in the app to try a Refresh Token.
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
        }

        // If the token is tampered with (invalid signature), block it.
        console.warn("Security Alert: Invalid token signature.");
        return res.status(403).json({ message: "Invalid session." });
    }
};

/**
 * REQUIRE AUTH: Blocks the request if authenticateToken didn't find a user.
 * Use this for Protected routes like createLeague or deleteLeague.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: "You must be logged in to enter the ring." });
    }
    next();
};