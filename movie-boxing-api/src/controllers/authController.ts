import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';
import { Resend } from 'resend';

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * HELPER: Generate and Send Verification Code
 */
const sendVerificationCode = async (userId: number, email: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes

    // 1. Store in DB
    await pool.query(
        `INSERT INTO "VerificationCodes" ("UserId", "Code", "ExpiresAt") VALUES ($1, $2, $3)`,
        [userId, code, expiresAt]
    );

    // 2. Send via Resend
    await resend.emails.send({
        from: 'MovieBoxing <verify@noreply.movieboxing.com>', // Ensure this domain is verified in Resend
        to: email,
        subject: 'Verify your Ring Entrance',
        html: `
            <div style="font-family: sans-serif; background: #020617; color: white; padding: 40px; border-radius: 20px;">
                <h1 style="color: #dc2626; font-style: italic; text-transform: uppercase;">Equipment Check!</h1>
                <p>Welcome to the arena. Use the code below to verify your account:</p>
                <div style="background: #000; padding: 20px; border: 1px solid #1f2937; border-radius: 10px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #dc2626;">
                    ${code}
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">This code expires in 15 minutes.</p>
            </div>
        `
    });
};

/**
 * Handle User Login
 */
export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username/Email and password are required." });
    }

    const identifier = username.trim().toLowerCase();

    try {
        const query = `SELECT * FROM "Users" WHERE "Email" = $1 OR "Username" = $1`;
        const { rows } = await pool.query(query, [identifier]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.PasswordHash || user.passwordhash))) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Optional: Block login if not verified (Uncomment if you want to force verification)
        // if (!user.IsVerified && !user.isverified) {
        //     return res.status(403).json({ message: "Please verify your email before logging in.", userId: user.UserId });
        // }

        const accessToken = jwt.sign(
            { userId: user.UserId, name: user.DisplayName },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await pool.query(
            `INSERT INTO "RefreshTokens" ("UserId", "Token", "ExpiresAt") VALUES ($1, $2, $3)`,
            [user.UserId, refreshToken, expiresAt]
        );

        return res.status(200).json({
            accessToken,
            refreshToken,
            userId: (user.UserId || user.userid).toString(),
            displayName: user.DisplayName || user.displayname,
            email: user.Email || user.email,
            username: user.Username || user.username
        });

    } catch (err) {
        console.error('Login failed:', err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Handle User Registration
 */
export const register = async (req: Request, res: Response) => {
    const { name, username, email, password } = req.body;

    if (!email || !password || !name || !username) {
        return res.status(400).send("Must enter all fields to create account.");
    }

    const parsedUsername = username.trim().toLowerCase();
    const parsedEmail = email.trim().toLowerCase();

    try {
        const checkQuery = `SELECT "UserId" FROM "Users" WHERE "Email" = $1 OR "Username" = $2`;
        const existingUser = await pool.query(checkQuery, [parsedEmail, parsedUsername]);

        if (existingUser.rows.length > 0) {
            return res.status(409).send("Email or username already in use.");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Updated Insert: Includes IsVerified defaulting to FALSE
        const insertQuery = `
            INSERT INTO "Users" ("Email", "PasswordHash", "DisplayName", "JoinDate", "Username", "IsVerified") 
            VALUES ($1, $2, $3, NOW(), $4, FALSE)
            RETURNING "UserId", "DisplayName", "Email", "Username"
        `;
        const result = await pool.query(insertQuery, [parsedEmail, hashedPassword, name, parsedUsername]);
        const newUser = result.rows[0];

        // NEW: Send Verification Email
        await sendVerificationCode(newUser.UserId, newUser.Email);

        const accessToken = jwt.sign(
            { userId: newUser.UserId, name: newUser.DisplayName },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await pool.query(
            `INSERT INTO "RefreshTokens" ("UserId", "Token", "ExpiresAt") VALUES ($1, $2, $3)`,
            [newUser.UserId, refreshToken, expiresAt]
        );

        return res.status(201).json({
            accessToken,
            refreshToken,
            userId: newUser.UserId,
            displayName: newUser.DisplayName,
            username: newUser.Username,
            email: newUser.Email,
            requiresVerification: true // Let the frontend know to redirect to /verify
        });

    } catch (err) {
        console.error('Registration failed:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Verify Code Endpoint
 */
export const verifyEmail = async (req: Request, res: Response) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ message: "User ID and code are required." });
    }

    try {
        const query = `
            SELECT * FROM "VerificationCodes" 
            WHERE "UserId" = $1 AND "Code" = $2 AND "Used" = FALSE AND "ExpiresAt" > NOW()
            ORDER BY "ExpiresAt" DESC LIMIT 1
        `;
        const { rows } = await pool.query(query, [userId, code]);
        const validCode = rows[0];

        if (!validCode) {
            return res.status(400).json({ message: "Invalid or expired code." });
        }

        // 1. Mark code as used
        await pool.query('UPDATE "VerificationCodes" SET "Used" = TRUE WHERE "Id" = $1', [validCode.Id]);

        // 2. Mark user as verified
        await pool.query('UPDATE "Users" SET "IsVerified" = TRUE WHERE "UserId" = $1', [userId]);

        return res.status(200).json({ message: "Account successfully verified!" });
    } catch (err) {
        console.error('Verification failed:', err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Resend Verification Code
 */
export const resendCode = async (req: Request, res: Response) => {
    const { userId } = req.body;

    try {
        const userQuery = `SELECT "Email", "IsVerified" FROM "Users" WHERE "UserId" = $1`;
        const { rows } = await pool.query(userQuery, [userId]);
        const user = rows[0];

        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.IsVerified || user.isverified) return res.status(400).json({ message: "Account already verified." });

        await sendVerificationCode(userId, user.Email);
        return res.status(200).json({ message: "New code sent to your email." });
    } catch (err) {
        return res.status(500).json({ message: "Failed to resend code." });
    }
};

/**
 * Synchronize Google User (Usually skip verification for Google)
 */
export const syncGoogleUser = async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_WEB_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload?.email;
        const name = payload?.name;

        if (!email) return res.status(400).json({ message: "Email required from Google." });

        const checkQuery = `SELECT * FROM "Users" WHERE "Email" = $1`;
        const { rows } = await pool.query(checkQuery, [email.toLowerCase()]);
        
        let user;
        if (rows.length > 0) {
            user = rows[0];
        } else {
            const placeholderUsername = email.split('@')[0] + '_google';
            const insertQuery = `
                INSERT INTO "Users" ("Email", "DisplayName", "Username", "JoinDate", "PasswordHash", "IsVerified") 
                VALUES ($1, $2, $3, NOW(), NULL, TRUE) 
                RETURNING *;
            `; // Google users are auto-verified
            const insertRes = await pool.query(insertQuery, [email.toLowerCase(), name || 'Google User', placeholderUsername]);
            user = insertRes.rows[0];
        }

        const userId = user.UserId || user.userid;
        const accessToken = jwt.sign({ userId, name: user.DisplayName }, process.env.JWT_SECRET!, { expiresIn: '15m' });
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await pool.query(`INSERT INTO "RefreshTokens" ("UserId", "Token", "ExpiresAt") VALUES ($1, $2, $3)`, [userId, refreshToken, expiresAt]);

        return res.status(200).json({
            accessToken,
            refreshToken,
            userId: userId.toString(),
            displayName: user.DisplayName,
            email: user.Email,
            username: user.Username
        });
    } catch (err) {
        return res.status(500).json({ message: "Google Sync failed." });
    }
};

/**
 * Check if a username is already taken.
 * Useful for real-time validation on the registration screen.
 */
export const checkUsername = async (req: Request, res: Response) => {
    const { username } = req.body;

    // 1. Basic Presence Check
    if (!username) {
        return res.status(400).json({ available: false, message: "Username is required." });
    }

    // 2. Mirror your registration sanitization
    const parsedUsername = username.trim().toLowerCase();

    // 3. Mirror your registration validation rules
    if (parsedUsername.length < 3 || parsedUsername.length > 50) {
        return res.status(200).json({
            available: false,
            message: "Username must be between 3 and 50 characters."
        });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(parsedUsername)) {
        return res.status(200).json({
            available: false,
            message: "Username can only contain letters, numbers, and underscores."
        });
    }

    try {
        // 4. Query Postgres for the username
        const checkQuery = `SELECT "UserId" FROM "Users" WHERE "Username" = $1`;
        const { rows } = await pool.query(checkQuery, [parsedUsername]);

        if (rows.length > 0) {
            return res.status(200).json({
                available: false,
                message: "This fighter name is already taken."
            });
        }

        // 5. Success - Username is clear
        return res.status(200).json({
            available: true,
            message: "Username is available!"
        });

    } catch (err) {
        console.error('Username check failed:', err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) return res.status(401).send("Refresh token required.");

    try {
        // 1. Verify token exists and is not expired
        const query = `
            SELECT rt.*, u."DisplayName" 
            FROM "RefreshTokens" rt
            JOIN "Users" u ON rt."UserId" = u."UserId"
            WHERE rt."Token" = $1 AND rt."ExpiresAt" > NOW()
        `;
        const { rows } = await pool.query(query, [refreshToken]);
        const session = rows[0];

        if (!session) return res.status(403).send("Invalid or expired refresh token.");

        // 2. Generate new Access Token
        const newAccessToken = jwt.sign(
            { userId: session.UserId, name: session.DisplayName },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(500).send("Refresh failed.");
    }
};

export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token is required to logout." });
    }

    try {
        // Delete the specific session token
        const deleteQuery = `DELETE FROM "RefreshTokens" WHERE "Token" = $1`;
        const result = await pool.query(deleteQuery, [refreshToken]);

        // Even if the token wasn't found (already deleted), we return 204
        return res.status(204).send();

    } catch (err) {
        console.error('Logout failed:', err);
        return res.status(500).json({ message: "Internal Server Error during logout." });
    }
};