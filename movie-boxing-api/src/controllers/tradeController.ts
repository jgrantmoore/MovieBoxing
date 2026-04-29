import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';

/**
 * Create Trade Proposal
 * POST /api/trades/create
 */
export const createTrade = async (req: Request, res: Response) => {
    const { ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId, Incentive } = req.body;

    if (!ProposingTeamId || !TargetTeamId || !OfferedMovieId || !RequestedMovieId) {
        return res.status(400).send("Missing required fields for trade proposal.");
    }

    try {
        // Fetch verification details (League and Ownership)
        const verificationQuery = `
            SELECT tm."TeamId", tm."MovieId", t."LeagueId", l."StartDate", l."EndDate"
            FROM "TeamMovies" tm
            JOIN "Teams" t ON tm."TeamId" = t."TeamId"
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            WHERE tm."TeamId" IN ($1, $2) AND tm."MovieId" IN ($3, $4);
        `;
        const vResult = await pool.query(verificationQuery, [ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId]);

        if (vResult.rows.length < 2) {
            return res.status(404).send("Ownership verification failed.");
        }

        const [rowA, rowB] = vResult.rows;

        // 1. Same League Check
        if (rowA.LeagueId !== rowB.LeagueId) {
            return res.status(400).send("Teams must be in the same league.");
        }

        // 2. League Active Check
        const now = new Date();
        if (now < rowA.StartDate || now > rowA.EndDate) {
            return res.status(403).send("Trades are only allowed while the league is active.");
        }

        // 3. Ownership Verification
        const proposerOwnsOffered = vResult.rows.find(r => r.TeamId === ProposingTeamId && r.MovieId === OfferedMovieId);
        const targetOwnsRequested = vResult.rows.find(r => r.TeamId === TargetTeamId && r.MovieId === RequestedMovieId);

        if (!proposerOwnsOffered || !targetOwnsRequested) {
            return res.status(403).send("One of the teams no longer owns the movie involved.");
        }

        const insertQuery = `
            INSERT INTO "TradeProposals" ("ProposingTeamId", "TargetTeamId", "OfferedMovieId", "RequestedMovieId", "Incentive", "CreatedAt", "Pending", "Accepted")
            VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, FALSE)
            RETURNING *;
        `;

        const { rows } = await pool.query(insertQuery, [ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId, Incentive || null]);

        return res.status(201).json(rows[0]);
    } catch (error) {
        console.error(`Error proposing trade: ${error}`);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Accept Trade Proposal
 * POST /api/trades/accept
 */
export const acceptTrade = async (req: Request, res: Response) => {
    const ownerUserId = req.user!.userId;
    const { TradeId } = req.body;

    if (!TradeId) return res.status(400).send("Trade ID required.");

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const tradeQuery = `
            SELECT t.*, 
                   l."StartDate", l."EndDate",
                   team."OwnerUserId" as "TargetOwnerId"
            FROM "TradeProposals" t
            JOIN "Teams" team ON t."TargetTeamId" = team."TeamId"
            JOIN "Leagues" l ON team."LeagueId" = l."LeagueId"
            WHERE t."TradeId" = $1 AND t."Pending" = TRUE;
        `;
        const tradeRes = await client.query(tradeQuery, [TradeId]);

        if (tradeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("Trade proposal not found or already processed.");
        }

        const trade = tradeRes.rows[0];

        if (trade.TargetOwnerId !== ownerUserId) {
            await client.query('ROLLBACK');
            return res.status(403).send("Only the trade recipient can accept this trade.");
        }

        const now = new Date();
        if (now < trade.StartDate || now > trade.EndDate) {
            await client.query('ROLLBACK');
            return res.status(403).send("Trades cannot be accepted outside of active league dates.");
        }

        // ATOMIC SWAP
        await client.query(
            `UPDATE "TeamMovies" SET "TeamId" = $1 WHERE "TeamId" = $2 AND "MovieId" = $3`,
            [trade.TargetTeamId, trade.ProposingTeamId, trade.OfferedMovieId]
        );

        await client.query(
            `UPDATE "TeamMovies" SET "TeamId" = $1 WHERE "TeamId" = $2 AND "MovieId" = $3`,
            [trade.ProposingTeamId, trade.TargetTeamId, trade.RequestedMovieId]
        );

        // Update trade status
        await client.query(
            `UPDATE "TradeProposals" SET "Pending" = FALSE, "Accepted" = TRUE, "ProcessedAt" = NOW() WHERE "TradeId" = $1`,
            [TradeId]
        );

        // Auto-cancel conflicting trades
        await client.query(
            `UPDATE "TradeProposals" 
             SET "Pending" = FALSE, "ProcessedAt" = NOW()
             WHERE "TradeId" != $1 
             AND "Pending" = TRUE 
             AND ("OfferedMovieId" IN ($2, $3) OR "RequestedMovieId" IN ($2, $3))`,
            [TradeId, trade.OfferedMovieId, trade.RequestedMovieId]
        );

        await client.query('COMMIT');
        return res.status(200).json({ message: "Trade successful. Rosters updated." });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Accept Trade Error:", error);
        return res.status(500).send("Internal server error.");
    } finally {
        client.release();
    }
};

/**
 * Deny (or Withdraw) Trade Proposal
 * POST /api/trades/deny
 */
export const denyTrade = async (req: Request, res: Response) => {
    const ownerUserId = req.user!.userId;
    const { TradeId } = req.body;

    if (!TradeId) return res.status(400).send("Trade ID required.");

    try {
        const findQuery = `
            SELECT t.*, 
                   tp."OwnerUserId" as "ProposerOwnerId",
                   tt."OwnerUserId" as "TargetOwnerId"
            FROM "TradeProposals" t
            JOIN "Teams" tp ON t."ProposingTeamId" = tp."TeamId"
            JOIN "Teams" tt ON t."TargetTeamId" = tt."TeamId"
            WHERE t."TradeId" = $1 AND t."Pending" = TRUE;
        `;
        const tradeRes = await pool.query(findQuery, [TradeId]);

        if (tradeRes.rows.length === 0) {
            return res.status(404).send("Pending trade proposal not found.");
        }

        const trade = tradeRes.rows[0];
        const isProposer = trade.ProposerOwnerId === ownerUserId;
        const isTarget = trade.TargetOwnerId === ownerUserId;

        if (!isProposer && !isTarget) {
            return res.status(403).send("You are not authorized to modify this trade.");
        }

        await pool.query(
            `UPDATE "TradeProposals" SET "Pending" = FALSE, "Accepted" = FALSE, "ProcessedAt" = NOW() WHERE "TradeId" = $1`,
            [TradeId]
        );

        return res.status(200).json({ message: isTarget ? "Trade denied." : "Trade withdrawn." });
    } catch (error) {
        console.error("Deny Trade Error:", error);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Get Pending Trades for User
 * GET /api/trades/pending
 */
export const getPendingTrades = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
        const query = `
            SELECT t.*, 
                   m1."Title" as "OfferedMovieTitle", m1."PosterUrl" as "OfferedPoster",
                   m2."Title" as "RequestedMovieTitle", m2."PosterUrl" as "RequestedPoster",
                   tp."TeamName" as "ProposingTeamName", tp."OwnerUserId" as "ProposingOwnerUserId",
                   tt."TeamName" as "TargetTeamName", tt."OwnerUserId" as "TargetOwnerUserId",
                   l."LeagueId", l."LeagueName"
            FROM "TradeProposals" t
            JOIN "Teams" tp ON t."ProposingTeamId" = tp."TeamId"
            JOIN "Teams" tt ON t."TargetTeamId" = tt."TeamId"
            JOIN "Movies" m1 ON t."OfferedMovieId" = m1."MovieId"
            JOIN "Movies" m2 ON t."RequestedMovieId" = m2."MovieId"
            JOIN "Leagues" l ON tp."LeagueId" = l."LeagueId"
            WHERE t."Pending" = TRUE 
            AND (tp."OwnerUserId" = $1 OR tt."OwnerUserId" = $1);
        `;
        const { rows } = await pool.query(query, [userId]);
        return res.json(rows);
    } catch (error) {
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Get Trade History for a League
 * GET /api/trades/history
 */
export const getTradeHistory = async (req: Request, res: Response) => {
    const { leagueId } = req.query;

    try {
        const query = `
            SELECT t.*, 
                   m1."Title" as "OfferedMovieTitle", 
                   m2."Title" as "RequestedMovieTitle",
                   tp."TeamName" as "ProposingTeamName",
                   tt."TeamName" as "TargetTeamName"
            FROM "TradeProposals" t
            JOIN "Teams" tp ON t."ProposingTeamId" = tp."TeamId"
            JOIN "Teams" tt ON t."TargetTeamId" = tt."TeamId"
            JOIN "Movies" m1 ON t."OfferedMovieId" = m1."MovieId"
            JOIN "Movies" m2 ON t."RequestedMovieId" = m2."MovieId"
            WHERE tp."LeagueId" = $1 AND t."Pending" = FALSE
            ORDER BY t."ProcessedAt" DESC;
        `;
        const { rows } = await pool.query(query, [leagueId]);
        return res.json(rows);
    } catch (error) {
        return res.status(500).send("Internal server error.");
    }
};