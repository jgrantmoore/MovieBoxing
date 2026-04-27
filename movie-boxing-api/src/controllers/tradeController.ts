import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';

/**
 *  Create Trade Proposal
 *  POST /api/trades/create
 *  Body: { ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId, Incentive (optional) }
 *  Auth Required: Yes (Must be a member of the proposing team)
 */
export const createTrade = async (req: Request, res: Response) => {
    // 1. Extract data from middleware and body
    const ownerUserId = req.user!.userId;
    const { ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId, Incentive } = req.body;

    // 2. Validate required fields
    if (!ProposingTeamId || !TargetTeamId || !OfferedMovieId || !RequestedMovieId) {
        return res.status(400).send("Missing required fields for trade proposal.");
    }

    try {
        // 3. Fetch Team/Movie details AND verify they are in the same active league
        const verificationQuery = `
        SELECT tm."TeamId", tm."MovieId", t."LeagueId", l."StartDate", l."EndDate", m."ReleaseDate"
        FROM "TeamMovies" tm
        JOIN "Teams" t ON tm."TeamId" = t."TeamId"
        JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
        JOIN "Movies" m ON tm."MovieId" = m."MovieId"
        WHERE tm."TeamId" IN ($1, $2) AND tm."MovieId" IN ($3, $4);
    `;
        const vResult = await pool.query(verificationQuery, [ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId]);

        if (vResult.rows.length < 2) {
            return res.status(404).send("Ownership verification failed.");
        }

        const [rowA, rowB] = vResult.rows;

        // A. Check if they are in the same league
        if (rowA.LeagueId !== rowB.LeagueId) {
            return res.status(400).send("Teams must be in the same league.");
        }

        // B. Check if League is active (using your specific "between" logic)
        const now = new Date();
        if (now < rowA.StartDate || now > rowA.EndDate) {
            return res.status(403).send("Trades are only allowed while the league is active.");
        }

        // C. Check if either movie is already released (NOT CURRENTLY ENFORCED)
        // if (new Date(rowA.ReleaseDate) <= now || new Date(rowB.ReleaseDate) <= now) {
        //     return res.status(403).send("Cannot trade movies that have already been released.");
        // }

        // D. Explicit Ownership Check
        const proposerOwnsOffered = vResult.rows.find(r => r.TeamId === ProposingTeamId && r.MovieId === OfferedMovieId);
        const targetOwnsRequested = vResult.rows.find(r => r.TeamId === TargetTeamId && r.MovieId === RequestedMovieId);

        if (!proposerOwnsOffered || !targetOwnsRequested) {
            return res.status(403).send("One of the teams no longer owns the movie involved in the trade.");
        }
        // 5. Insert the new team into Postgres
        const insertQuery = `
                INSERT INTO "TradeProposals" ("ProposingTeamId", "TargetTeamId", "OfferedMovieId", "RequestedMovieId", "Incentive", "CreatedAt", "Pending", "Accepted")
                VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, FALSE)
                RETURNING *;
            `;

        const { rows } = await pool.query(insertQuery, [ProposingTeamId, TargetTeamId, OfferedMovieId, RequestedMovieId, Incentive || null]);

        if (rows.length > 0) {
            return res.status(201).json(rows[0]);
        } else {
            return res.status(500).send("Failed to propose trade. Please try again.");
        }

    }
    catch (error) {
        console.error(`Error proposing trade: ${error}`);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Accept Trade Proposal
 * POST /api/trades/accept
 * Body: { TradeId }
 * Auth Required: Yes (Must be the owner of the TargetTeam)
 */
export const acceptTrade = async (req: Request, res: Response) => {
    const ownerUserId = req.user!.userId;
    const { TradeId } = req.body;

    if (!TradeId) return res.status(400).send("Trade ID required.");

    const client = await pool.connect(); // Use a client for the transaction

    try {
        await client.query('BEGIN');

        // 1. Fetch trade details and verify the "Target" is the one accepting
        const tradeQuery = `
            SELECT t.*, 
                   l."StartDate", l."EndDate",
                   m1."ReleaseDate" as "OfferedRelease", 
                   m2."ReleaseDate" as "RequestedRelease",
                   team."OwnerUserId" as "TargetOwnerId"
            FROM "TradeProposals" t
            JOIN "Teams" team ON t."TargetTeamId" = team."TeamId"
            JOIN "Leagues" l ON team."LeagueId" = l."LeagueId"
            JOIN "Movies" m1 ON t."OfferedMovieId" = m1."MovieId"
            JOIN "Movies" m2 ON t."RequestedMovieId" = m2."MovieId"
            WHERE t."TradeId" = $1 AND t."Pending" = TRUE;
        `;
        const tradeRes = await client.query(tradeQuery, [TradeId]);

        if (tradeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("Trade proposal not found or already processed.");
        }

        const trade = tradeRes.rows[0];

        // 2. Security: Only the owner of the TargetTeam can accept
        if (trade.TargetOwnerId !== ownerUserId) {
            await client.query('ROLLBACK');
            return res.status(403).send("Only the trade request recipient can accept this trade.");
        }

        // 3. League Active Check (Using your "between dates" logic)
        const now = new Date();
        if (now < trade.StartDate || now > trade.EndDate) {
            await client.query('ROLLBACK');
            return res.status(403).send("Trades cannot be accepted outside of active league dates.");
        }

        // 4. Release Check: Ensure neither movie has released yet (NOT CURRENTLY ENFORCED)
        // if (new Date(trade.OfferedRelease) <= now || new Date(trade.RequestedRelease) <= now) {
        //     await client.query('ROLLBACK');
        //     return res.status(403).send("One of these movies has already premiered.");
        // }

        // 5. ATOMIC SWAP: Update TeamMovies
        // Move Movie A to Team B
        await client.query(
            `UPDATE "TeamMovies" SET "TeamId" = $1 WHERE "TeamId" = $2 AND "MovieId" = $3`,
            [trade.TargetTeamId, trade.ProposingTeamId, trade.OfferedMovieId]
        );

        // Move Movie B to Team A
        await client.query(
            `UPDATE "TeamMovies" SET "TeamId" = $1 WHERE "TeamId" = $2 AND "MovieId" = $3`,
            [trade.ProposingTeamId, trade.TargetTeamId, trade.RequestedMovieId]
        );

        // 6. Mark trade as accepted
        await client.query(
            `UPDATE "TradeProposals" SET "Pending" = FALSE, "Accepted" = TRUE, "ProcessedAt" = NOW() WHERE "TradeId" = $1`,
            [TradeId]
        );

        // 7. Auto-cancel any other PENDING trades involving these specific movies
        // (Since the owners have now changed, other trades for these movies are invalid)
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
 * Body: { TradeId }
 * Auth Required: Yes (Must be the owner of either the ProposingTeam to withdraw or the TargetTeam to deny)
 */
export const denyTrade = async (req: Request, res: Response) => {
    const ownerUserId = req.user!.userId;
    const { TradeId } = req.body;

    if (!TradeId) return res.status(400).send("Trade ID required.");

    try {
        // 1. Fetch trade to verify ownership
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

        // 2. Security Check: Only the Proposer (to withdraw) or the Target (to deny) can do this
        const isProposer = trade.ProposerOwnerId === ownerUserId;
        const isTarget = trade.TargetOwnerId === ownerUserId;

        if (!isProposer && !isTarget) {
            return res.status(403).send("You are not authorized to cancel or deny this trade.");
        }

        // 3. Update the trade status
        // We set Accepted = FALSE and Pending = FALSE
        const updateQuery = `
            UPDATE "TradeProposals" 
            SET "Pending" = FALSE, 
                "Accepted" = FALSE, 
                "ProcessedAt" = NOW() 
            WHERE "TradeId" = $1
            RETURNING *;
        `;

        await pool.query(updateQuery, [TradeId]);

        const message = isTarget ? "Trade proposal denied." : "Trade proposal withdrawn.";
        return res.status(200).json({ message });

    } catch (error) {
        console.error("Deny Trade Error:", error);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Get Pending Trades for User
 * GET /api/trades/pending
 * Auth Required: Yes
 */
export const getPendingTrades = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
        const query = `
            SELECT t.*, 
                   m1."Title" as "OfferedMovieTitle", 
                   m1."PosterUrl" as "OfferedPoster",
                   m1."InternationalReleaseDate" as "OfferedInternationalReleaseDate",
                   m1."USReleaseDate" as "OfferedUSReleaseDate",
                   m1."BoxOffice" as "OfferedBoxOffice",
                   m2."Title" as "RequestedMovieTitle", 
                   m2."PosterUrl" as "RequestedPoster",
                   m2."InternationalReleaseDate" as "InternationalReleaseDate",
                   m2."USReleaseDate" as "RequestedUSReleaseDate",
                   m2."BoxOffice" as "RequestedBoxOffice",
                   tp."TeamName" as "ProposingTeamName",
                   tp."OwnerUserId" as "ProposingOwnerUserId",
                   tt."TeamName" as "TargetTeamName",
                   tt."OwnerUserId" as "TargetOwnerUserId"
            FROM "TradeProposals" t
            JOIN "Teams" tp ON t."ProposingTeamId" = tp."TeamId"
            JOIN "Teams" tt ON t."TargetTeamId" = tt."TeamId"
            JOIN "Movies" m1 ON t."OfferedMovieId" = m1."MovieId"
            JOIN "Movies" m2 ON t."RequestedMovieId" = m2."MovieId"
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
 * GET /api/trades/pending
 * Auth Required: No
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
                   t."Accepted",
                   t."ProcessedAt"
            FROM "TradeProposals" t
            JOIN "Teams" tp ON t."ProposingTeamId" = tp."TeamId"
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