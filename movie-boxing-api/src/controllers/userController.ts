import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import * as bcrypt from 'bcrypt';

/**
 * Fetch the top 5 movies owned by a user across all active leagues.
 * Used for "Draft Highlights" on the profile or dashboard.
 */
export const getTopPerformingMovies = async (req: Request, res: Response) => {
    // 1. Logic: Use the 'id' query param for viewing others, 
    // or fall back to the logged-in user's ID for their own dashboard.
    const queryId = req.query.id as string;
    const userId = queryId ? parseInt(queryId) : req.user?.userId;

    if (!userId) {
        return res.status(400).send("User ID is required.");
    }

    try {
        // 2. Postgres Join Query
        // Replaced TOP 5 with LIMIT 5 and GETDATE() with NOW()
        const query = `
            SELECT 
                m."Title",
                m."BoxOffice",
                m."InternationalReleaseDate",
                m."PosterUrl",
                m."MovieId",
                tm."OrderDrafted",
                t."TeamName",
                l."LeagueName"
            FROM "TeamMovies" tm
            JOIN "Movies" m ON tm."MovieId" = m."MovieId"
            JOIN "Teams" t ON tm."TeamId" = t."TeamId"
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            JOIN "Users" u ON t."OwnerUserId" = u."UserId"
            WHERE u."UserId" = $1
            AND l."EndDate" >= NOW() 
            AND l."StartDate" <= NOW()
            AND tm."OrderDrafted" <= 5 
            ORDER BY m."BoxOffice" DESC
            LIMIT 5;
        `;

        const { rows } = await pool.query(query, [userId]);

        // 3. Return 200 with empty array if nothing found (standard for lists)
        return res.status(200).json(rows);

    } catch (err) {
        console.error('Database query failed for top movies:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Fetch basic profile info for a specific user.
 */
export const getUser = async (req: Request, res: Response) => {
    try {
        // 1. Get the ID from the query string (?id=123)
        const targetUserId = req.query.id;

        if (!targetUserId) {
            return res.status(400).send("User ID is required.");
        }

        // 2. Postgres Query
        const query = `
            SELECT 
                "UserId",
                "Username",
                "JoinDate",
                "DisplayName"
            FROM "Users"
            WHERE "UserId" = $1
        `;

        const { rows } = await pool.query(query, [parseInt(targetUserId as string)]);

        // 3. Handle existence
        if (rows.length === 0) {
            return res.status(404).send("User not found.");
        }

        // Return just the single user object
        return res.status(200).json(rows[0]);

    } catch (err) {
        console.error('Database query failed for getUser:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Aggregate stats for a user profile (Total Earnings, Wins, etc.)
 * Only counts STARTER movies toward box office totals and movie counts.
 */
export const getUserStats = async (req: Request, res: Response) => {
    const targetUserId = req.query.id;

    if (!targetUserId) {
        return res.status(400).send("User ID is required.");
    }

    const client = await pool.connect();

    try {
        // 1. Aggregated Global User Stats
        const statsQuery = `
            SELECT 
                u."UserId", u."Username", u."JoinDate", u."DisplayName",
                
                (SELECT COUNT(*) FROM "Teams" WHERE "OwnerUserId" = u."UserId") AS "LeagueCount",
                
                (SELECT COUNT(*) 
                 FROM "TeamMovies" tm 
                 JOIN "Teams" t ON tm."TeamId" = t."TeamId" 
                 WHERE t."OwnerUserId" = u."UserId" AND tm."IsStarting" = true) AS "MovieCount",
                
                (SELECT COUNT(*) FROM "Leagues" WHERE "LeagueWinnerId" = u."UserId") AS "LeaguesWon",

                -- NEW: TotalTrades count
                (SELECT COUNT(*) 
                 FROM "TradeProposals" tp
                 JOIN "Teams" t1 ON tp."ProposingTeamId" = t1."TeamId"
                 JOIN "Teams" t2 ON tp."TargetTeamId" = t2."TeamId"
                 WHERE (t1."OwnerUserId" = u."UserId" OR t2."OwnerUserId" = u."UserId")
                 AND tp."Accepted" = true) AS "TotalTrades",
                
                COALESCE((
                    SELECT SUM(m."BoxOffice") 
                    FROM "Movies" m
                    JOIN "TeamMovies" tm ON m."MovieId" = tm."MovieId" 
                    JOIN "Teams" t ON tm."TeamId" = t."TeamId"
                    WHERE t."OwnerUserId" = u."UserId" AND tm."IsStarting" = true
                ), 0) AS "TotalEarnings"
            FROM "Users" u
            WHERE u."UserId" = $1
        `;

        // 2. Recent Leagues with Rank and Activity Status (Kept same as previous update)
        const recentLeaguesQuery = `
            WITH LeagueRankings AS (
                SELECT 
                    t."TeamId", t."OwnerUserId", t."TeamName",
                    l."LeagueId", l."LeagueName", l."StartDate", l."EndDate",
                    RANK() OVER (
                        PARTITION BY l."LeagueId" 
                        ORDER BY COALESCE(SUM(m."BoxOffice"), 0) DESC
                    ) as "PlayerRank",
                    COUNT(*) OVER (PARTITION BY l."LeagueId") as "TotalPlayers"
                FROM "Teams" t
                JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
                LEFT JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId" AND tm."IsStarting" = true
                LEFT JOIN "Movies" m ON tm."MovieId" = m."MovieId"
                GROUP BY t."TeamId", l."LeagueId", l."StartDate", l."EndDate"
            )
            SELECT 
                "TeamId", "TeamName", "LeagueId", "LeagueName", "PlayerRank", "TotalPlayers",
                (CURRENT_TIMESTAMP >= "StartDate" AND CURRENT_TIMESTAMP <= "EndDate") AS "LeagueActive"
            FROM LeagueRankings
            WHERE "OwnerUserId" = $1
            ORDER BY "StartDate" DESC
            LIMIT 5
        `;

        const statsRes = await client.query(statsQuery, [targetUserId]);

        if (statsRes.rows.length === 0) {
            return res.status(404).send("User not found.");
        }

        const recentRes = await client.query(recentLeaguesQuery, [targetUserId]);

        const responseData = {
            ...statsRes.rows[0],
            RecentLeagues: recentRes.rows
        };

        return res.status(200).json(responseData);

    } catch (err) {
        console.error('Database query failed for getUserStats:', err);
        return res.status(500).send("Internal Server Error");
    } finally {
        client.release();
    }
};

/**
 * Update user profile details (Name, Username, or Password).
 * PROTECTED: Requires authenticateToken
 */
export const updateUser = async (req: Request, res: Response) => {
    // 1. Get userId from the verified middleware
    const userId = req.user!.userId;
    const { name, username, password } = req.body;

    try {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // 2. Dynamically build the SET clause
        if (name) {
            updateFields.push(`"DisplayName" = $${paramIndex++}`);
            values.push(name);
        }
        if (username) {
            // Basic sanitization for the username
            const parsedUsername = username.trim().toLowerCase();
            updateFields.push(`"Username" = $${paramIndex++}`);
            values.push(parsedUsername);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            updateFields.push(`"PasswordHash" = $${paramIndex++}`);
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).send("No update information provided.");
        }

        // 3. Add UserId as the final parameter for the WHERE clause
        values.push(userId);
        const query = `
            UPDATE "Users" 
            SET ${updateFields.join(', ')} 
            WHERE "UserId" = $${paramIndex}
        `;

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).send("User not found.");
        }

        return res.status(200).send("User updated successfully.");

    } catch (err) {
        console.error('Update failed:', err);
        return res.status(500).send("Internal server error.");
    }
};