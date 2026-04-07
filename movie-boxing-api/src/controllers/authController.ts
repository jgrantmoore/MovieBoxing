import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

/**
 * Handle User Login (Accepts Username or Email)
 */
export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // 1. Basic Validation
    if (!username || !password) {
        return res.status(400).json({ message: "Username/Email and password are required." });
    }

    const identifier = username.trim().toLowerCase();
    
    if (identifier.length < 3 || identifier.length > 50) {
        return res.status(400).json({ message: "Username/Email must be between 3 and 50 characters." });
    }

    try {
        // 2. Postgres Query: Check both Email and Username
        const query = `
            SELECT * FROM "Users" 
            WHERE "Email" = $1 OR "Username" = $1
        `;
        const { rows } = await pool.query(query, [identifier]);
        const user = rows[0];

        // 3. Validate user existence and password
        // Always return a generic message for security
        if (!user || !(await bcrypt.compare(password, user.PasswordHash || user.passwordhash))) {
            return res.status(401).json({ message: "Invalid credentials. Double-check your username/email." });
        }

        // 4. Generate JWT
        // Using UserId and DisplayName for the payload
        const token = jwt.sign(
            { 
                userId: user.UserId || user.userid, 
                name: user.DisplayName || user.displayname 
            },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        // 5. Success Response
        return res.status(200).json({
            token,
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

    // 1. Basic Field Presence
    if (!email || !password || !name || !username) {
        return res.status(400).send("Must enter all fields to create account.");
    }

    // 2. Sanitization & Validation
    const parsedUsername = username.trim().toLowerCase();
    const parsedEmail = email.trim().toLowerCase();

    if (parsedUsername.length < 3 || parsedUsername.length > 50) {
        return res.status(400).send("Username must be between 3 and 50 characters.");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(parsedUsername)) {
        return res.status(400).send("Username can only contain letters, numbers, and underscores.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedEmail)) {
        return res.status(400).send("Invalid email format.");
    }

    try {
        // 3. Check for existing users (Email or Username)
        const checkQuery = `SELECT "UserId" FROM "Users" WHERE "Email" = $1 OR "Username" = $2`;
        const existingUser = await pool.query(checkQuery, [parsedEmail, parsedUsername]);

        if (existingUser.rows.length > 0) {
            return res.status(409).send("Email or username already in use.");
        }

        // 4. Hash Password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 5. Insert into Postgres
        const insertQuery = `
            INSERT INTO "Users" ("Email", "PasswordHash", "DisplayName", "JoinDate", "Username") 
            VALUES ($1, $2, $3, NOW(), $4)
        `;
        await pool.query(insertQuery, [parsedEmail, hashedPassword, name, parsedUsername]);

        return res.status(201).send("User registered successfully.");

    } catch (err) {
        console.error('Registration failed:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Synchronize a user authenticated via Google.
 * Logic: If user exists, log them in. If not, create a new record.
 */
export const syncGoogleUser = async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email) {
        return res.status(400).send("Email is required from Google provider.");
    }

    try {
        // 1. Check if the user already exists
        const checkQuery = `SELECT "UserId", "DisplayName", "Username" FROM "Users" WHERE "Email" = $1`;
        const { rows } = await pool.query(checkQuery, [email.toLowerCase()]);

        if (rows.length > 0) {
            const existingUser = rows[0];
            const userId = existingUser.UserId || existingUser.userid;

            // Generate Token for existing user
            const token = jwt.sign(
                { userId, email },
                process.env.JWT_SECRET!,
                { expiresIn: '24h' } // Increased to match your standard login
            );

            return res.status(200).json({
                token,
                userId: userId.toString(),
                username: existingUser.Username || existingUser.username || email.split('@')[0],
                displayName: existingUser.DisplayName || existingUser.displayname,
                isNewUser: false
            });
        }

        // 2. User doesn't exist - Create them
        const placeholderUsername = email.split('@')[0] + '_google';

        const insertQuery = `
            INSERT INTO "Users" ("Email", "DisplayName", "Username", "JoinDate", "PasswordHash") 
            VALUES ($1, $2, $3, NOW(), NULL)
            RETURNING "UserId";
        `;
        
        const insertRes = await pool.query(insertQuery, [
            email.toLowerCase(), 
            name || 'Google User', 
            placeholderUsername
        ]);

        const newUserId = insertRes.rows[0].UserId || insertRes.rows[0].userid;
        
        const newToken = jwt.sign(
            { userId: newUserId, email },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            token: newToken,
            userId: newUserId.toString(),
            username: placeholderUsername,
            displayName: name,
            isNewUser: true
        });

    } catch (err) {
        console.error('Google Sync failed:', err);
        return res.status(500).send("Internal Server Error during Google Sync");
    }
};