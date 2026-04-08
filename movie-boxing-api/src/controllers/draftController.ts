import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';
import { getMovieData } from '../utils/helpers.js';
import { io } from '../index.js';

/**
 * Draft/Pick a movie for a team.
 * Validates league dates, roster limits, and availability.
 */
export const pickMovie = async (req: Request, res: Response) => {
    const ownerUserId = req.user!.userId;
    const { TeamId, tmdbId } = req.body;

    if (!TeamId || tmdbId === undefined) {
        return res.status(400).send("Missing TeamId or tmdbId");
    }

    const client = await pool.connect();

    try {
        const movie = await getMovieData(tmdbId);
        const internalMovieId = movie.MovieId || movie.movieid;

        // 1. Get Stats and calculate Current Turn
        const validationQuery = `
            SELECT 
                (SELECT COUNT(*) FROM "TeamMovies" WHERE "LeagueId" = l."LeagueId" AND "MovieId" = $1) as "AlreadyPicked",
                (SELECT COUNT(*) FROM "TeamMovies" WHERE "TeamId" = $2) as "CurrentPicks",
                (SELECT COUNT(*) FROM "Teams" WHERE "LeagueId" = l."LeagueId") as "TotalTeams",
                t."OwnerUserId", t."DraftOrder",
                l."StartingNumber", l."BenchNumber", l."LeagueId",
                l."StartDate", l."EndDate", l."PreferredReleaseDate",
                l."DraftUsersTurn" as "CurrentPickPosition",
                m."USReleaseDate", m."InternationalReleaseDate"
            FROM "Teams" t
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            JOIN "Movies" m ON m."MovieId" = $1
            WHERE t."TeamId" = $2
        `;

        const valRes = await client.query(validationQuery, [internalMovieId, TeamId]);
        const stats = valRes.rows[0];

        if (!stats) return res.status(404).send("Team or Movie not found");

        const leagueId = stats.LeagueId;
        const currentPickPosition = parseInt(stats.CurrentPickPosition);
        const totalTeams = parseInt(stats.TotalTeams);
        const userDraftOrder = parseInt(stats.DraftOrder);
        const currentPicksCount = parseInt(stats.CurrentPicks);

        // 2. VERIFY CURRENT TURN (SNAKE LOGIC)
        const currentRound = Math.ceil(currentPickPosition / totalTeams);
        const isCurrentRoundEven = currentRound % 2 === 0;
        const relativePos = (currentPickPosition - 1) % totalTeams;

        const expectedOrder = isCurrentRoundEven
            ? (totalTeams - relativePos)
            : (relativePos + 1);

        if (userDraftOrder !== expectedOrder || stats.OwnerUserId !== ownerUserId) {
            return res.status(403).send("It is not your turn to draft.");
        }

        // 3. Roster & Date Validations
        if (parseInt(stats.AlreadyPicked) > 0) return res.status(400).send("Movie already taken");

        const maxRosterSize = stats.StartingNumber + stats.BenchNumber;
        if (currentPicksCount >= maxRosterSize) {
            return res.status(400).send("Roster full");
        }

        const releaseDate = new Date(stats.PreferredReleaseDate === 'us' ? stats.USReleaseDate : stats.InternationalReleaseDate);
        if (releaseDate < new Date(stats.StartDate) || releaseDate > new Date(stats.EndDate)) {
            return res.status(400).send("Movie release date outside league window");
        }

        // 4. TRANSACTIONAL UPDATE
        await client.query('BEGIN');

        // A. Insert the Pick
        const rosterSlot = currentPicksCount + 1;
        const isBench = currentPicksCount >= stats.StartingNumber;

        const insertPick = `
            INSERT INTO "TeamMovies" ("TeamId", "MovieId", "DateAdded", "IsStarting", "OrderDrafted", "LeagueId")
            VALUES ($1, $2, NOW(), $3, $4, $5)
        `;
        await client.query(insertPick, [TeamId, internalMovieId, !isBench, rosterSlot, leagueId]);

        // B. Advance Global Draft Position or Finish League
        const nextPickPosition = currentPickPosition + 1;
        const maxGlobalPicks = totalTeams * maxRosterSize;

        // Check if this was the final pick of the draft
        const isLastPick = currentPickPosition === maxGlobalPicks;

        if (isLastPick) {
            // Finalize the league status
            await client.query(`
                UPDATE "Leagues" 
                SET "IsDrafting" = false, 
                    "HasDrafted" = true 
                WHERE "LeagueId" = $1
            `, [leagueId]);
        } else {
            // Just move to the next person
            await client.query(`
                UPDATE "Leagues" 
                SET "DraftUsersTurn" = $1 
                WHERE "LeagueId" = $2
            `, [nextPickPosition, leagueId]);
        }

        await client.query('COMMIT');

        // 5. Broadcast to Arena
        io.to(`league_${leagueId}`).emit("draftUpdate", {
            lastPick: movie.Title,
            nextPick: isLastPick ? currentPickPosition : nextPickPosition,
            isFinished: isLastPick
        });

        return res.status(201).json({
            success: true,
            nextPick: isLastPick ? currentPickPosition : nextPickPosition,
            isFinished: isLastPick
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Pick Error: ${error.message}`);
        return res.status(500).send("Internal server error");
    } finally {
        client.release();
    }
};

/**
 * startDraft: Endpoint to start the draft for a league. 
 * Validates admin status, ensures the league hasn't already drafted, 
 * and toggles IsDrafting to true.
 */
export const startDraft = async (req: Request, res: Response) => {
    const { leagueId, newOrder } = req.body; // newOrder is the array from frontend
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update the Draft Order for all teams in the league
        if (newOrder && Array.isArray(newOrder)) {
            const orderPromises = newOrder.map(item => {
                return client.query(
                    `UPDATE "Teams" SET "DraftOrder" = $1 WHERE "TeamId" = $2 AND "LeagueId" = $3`,
                    [item.order, item.teamId, leagueId]
                );
            });
            await Promise.all(orderPromises);
        }

        // 2. Flip the League status and set the turn to 1
        const startLeagueQuery = `
            UPDATE "Leagues" 
            SET "IsDrafting" = true, 
                "DraftUsersTurn" = 1 
            WHERE "LeagueId" = $1 
            RETURNING *
        `;
        const result = await client.query(startLeagueQuery, [leagueId]);

        if (result.rowCount === 0) {
            throw new Error("League not found");
        }

        await client.query('COMMIT');

        // 3. Optional: Broadcast via Socket that the draft has begun
        io.to(`league_${leagueId}`).emit("draftStarted", { leagueId });

        return res.status(200).json({ success: true });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Start Draft Error:", error);
        return res.status(500).send(error.message || "Failed to start draft");
    } finally {
        client.release();
    }
};

/**
 * updateDraftOrder: Endpoint to update the draft order of teams in a league.
 * Validates admin status and updates the DraftOrder field for each team.
 * Expects body: { leagueId: number, newOrder: [{ teamId: number, order: number }] }
 */
export const updateDraftOrder = async (req: Request, res: Response) => {
    const { leagueId, newOrder } = req.body; // newOrder: [{ teamId: 1, order: 1 }, { teamId: 2, order: 2 }]
    const userId = req.user!.userId;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Security: Ensure the user is the Admin for this league
        const adminCheck = await client.query(
            'SELECT "AdminUserId" FROM "Leagues" WHERE "LeagueId" = $1',
            [leagueId]
        );

        if (adminCheck.rows[0]?.AdminUserId !== userId) {
            throw new Error("Unauthorized");
        }

        // Update each team's position
        for (const item of newOrder) {
            await client.query(
                'UPDATE "Teams" SET "DraftOrder" = $1 WHERE "TeamId" = $2 AND "LeagueId" = $3',
                [item.order, item.teamId, leagueId]
            );
        }

        await client.query('COMMIT');
        res.status(200).send("Order updated");
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send("Failed to update order");
    } finally {
        client.release();
    }
};