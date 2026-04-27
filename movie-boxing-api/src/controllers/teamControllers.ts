import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';
import { getMovieData } from '../utils/helpers.js';
import * as bcrypt from 'bcrypt';

/**
 * Admin Manual Assignment: Overrides a specific slot for a team.
 * PROTECTED: Requires authenticateToken, requireAuth
 */
export const assignMovie = async (req: Request, res: Response) => {
    const { TeamId, TMDBId, SlotNumber } = req.body;

    if (!TeamId || !TMDBId || !SlotNumber) {
        return res.status(400).send("Missing required fields: TeamId, TMDBId, or SlotNumber.");
    }

    const client = await pool.connect();

    try {
        // 1. Resolve Movie: Find or create in Postgres via helper
        const movie = await getMovieData(TMDBId);
        const internalMovieId = movie.MovieId || movie.movieid;

        // 2. Get League Context
        const contextQuery = `
            SELECT l."LeagueId", l."StartingNumber" 
            FROM "Teams" t 
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId" 
            WHERE t."TeamId" = $1
        `;
        const contextResult = await client.query(contextQuery, [TeamId]);
        const league = contextResult.rows[0];

        if (!league) {
            return res.status(404).send("League/Team context not found.");
        }

        const leagueId = league.LeagueId || league.leagueid;
        const startingNumber = league.StartingNumber || league.startingnumber;
        const IsStarting = SlotNumber <= startingNumber ? true : false;

        // 3. Start Transaction
        await client.query('BEGIN');

        // 4. Duplicate Check
        const duplicateCheckQuery = `
            SELECT 1 FROM "TeamMovies" 
            WHERE "LeagueId" = $1 AND "MovieId" = $2 AND "TeamId" <> $3
        `;
        const dupCheck = await client.query(duplicateCheckQuery, [leagueId, internalMovieId, TeamId]);

        if (dupCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).send("This movie is already owned by another team in this league.");
        }

        // 5. Delete existing occupant of the slot
        await client.query(
            'DELETE FROM "TeamMovies" WHERE "TeamId" = $1 AND "OrderDrafted" = $2',
            [TeamId, SlotNumber]
        );

        // 6. Insert new assignment
        const insertQuery = `
            INSERT INTO "TeamMovies" ("TeamId", "MovieId", "DateAdded", "IsStarting", "OrderDrafted", "LeagueId")
            VALUES ($1, $2, NOW(), $3, $4, $5)
        `;
        await client.query(insertQuery, [
            TeamId,
            internalMovieId,
            IsStarting,
            SlotNumber,
            leagueId
        ]);

        await client.query('COMMIT');
        return res.status(200).json({
            success: true,
            message: `Successfully assigned ${movie.Title || movie.title} to slot ${SlotNumber}.`
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Admin Manual Assign Error:", error);
        return res.status(500).send(error.message || "Internal Server Error");
    } finally {
        // CRITICAL: Always release the client back to the pool
        client.release();
    }
};

/**
 * Create a new team and join a league.
 * PROTECTED: Requires authenticateToken, requireAuth
 */
export const createTeam = async (req: Request, res: Response) => {
    // 1. Extract data from middleware and body
    const ownerUserId = req.user!.userId;
    const { TeamName, LeagueId, LeaguePassword } = req.body;

    // 2. Validate required fields
    if (!TeamName || LeagueId === undefined) {
        return res.status(400).send("Missing required fields: TeamName or LeagueId.");
    }

    try {
        // 3. Fetch league password hash to verify access
        const leagueQuery = `
            SELECT "JoinPasswordHash" 
            FROM "Leagues" 
            WHERE "LeagueId" = $1
        `;
        const leagueResult = await pool.query(leagueQuery, [LeagueId]);

        if (leagueResult.rows.length === 0) {
            return res.status(404).send("League not found.");
        }

        const dbHash = leagueResult.rows[0].JoinPasswordHash;

        // 4. Verification Logic
        // If the league has a password (private), verify it
        if (dbHash !== null) {
            const isMatch = await bcrypt.compare(LeaguePassword || "", dbHash);
            if (!isMatch) {
                return res.status(401).send("Invalid league password.");
            }
        }

        const dupCheck = await pool.query(
            'SELECT 1 FROM "Teams" WHERE "LeagueId" = $1 AND "OwnerUserId" = $2',
            [LeagueId, ownerUserId]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(400).send("You already have a team in this league.");
        }

        // 5. Insert the new team into Postgres
        const insertQuery = `
            INSERT INTO "Teams" ("LeagueId", "OwnerUserId", "TeamName")
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const { rows } = await pool.query(insertQuery, [LeagueId, ownerUserId, TeamName]);

        if (rows.length > 0) {
            return res.status(201).json(rows[0]);
        } else {
            return res.status(500).send("Failed to create team.");
        }

    } catch (error) {
        console.error(`Error creating team: ${error}`);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Delete a team (owner only).
 * PROTECTED: Requires authenticateToken, requireAuth
 */
export const deleteTeam = async (req: Request, res: Response) => {
    // 1. Get teamId from query string (?id=X)
    const teamId = req.query.id;
    if (!teamId) {
        return res.status(400).send("Team ID is required");
    }

    // 2. Identify the user from our middleware
    const userId = req.user!.userId;

    try {
        // 3. Postgres Delete
        // Note: rowCount is the Postgres equivalent of rowsAffected[0]
        const query = `
            DELETE FROM "Teams"
            WHERE "TeamId" = $1 AND "OwnerUserId" = $2
        `;

        const result = await pool.query(query, [parseInt(teamId as string), userId]);

        if (result.rowCount && result.rowCount > 0) {
            return res.status(200).send("Team deleted successfully");
        } else {
            // Either the team doesn't exist or the user doesn't own it
            return res.status(403).send("Forbidden: You are not the owner of this team or team not found");
        }
    } catch (error) {
        console.error(`Error deleting team: ${error}`);
        return res.status(500).send("Internal server error");
    }
};

/**
 * Fetch all teams for the logged-in user, including their movie picks.
 * Optimized for the "My Teams" dashboard.
 * PROTECTED: Requires authenticateToken, requireAuth
 */
export const getUserTeamsAndPicks = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
        const query = `
            SELECT 
                t."TeamId", 
                t."TeamName", 
                t."LeagueId",
                l."LeagueName",
                l."StartingNumber",
                l."BenchNumber",
                tm."MovieId",
                tm."OrderDrafted",
                tm."IsStarting",
                m."Title",
                m."PosterUrl",
                m."BoxOffice",
                m."USReleaseDate"
            FROM "Teams" t
            LEFT JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            LEFT JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId"
            LEFT JOIN "Movies" m ON tm."MovieId" = m."MovieId"
            WHERE t."OwnerUserId" = $1
            ORDER BY t."TeamId", tm."OrderDrafted" ASC
        `;

        const { rows } = await pool.query(query, [userId]);

        const teamsMap = new Map();

        rows.forEach(row => {
            const tId = row.TeamId || row.teamid;

            if (!teamsMap.has(tId)) {
                teamsMap.set(tId, {
                    TeamId: tId,
                    TeamName: row.TeamName || row.teamname,
                    LeagueId: row.LeagueId || row.leagueid,
                    LeagueName: row.LeagueName || row.leaguename,
                    StartingNumber: row.StartingNumber || row.startingnumber,
                    BenchNumber: row.BenchNumber || row.benchnumber,
                    Picks: []
                });
            }

            const movieId = row.MovieId || row.movieid;
            if (movieId) {
                teamsMap.get(tId).Picks.push({
                    MovieId: movieId,
                    Title: row.Title || row.title,
                    PosterUrl: row.PosterUrl || row.posterurl,
                    BoxOffice: row.BoxOffice || row.boxoffice,
                    OrderDrafted: row.OrderDrafted || row.orderdrafted,
                    ReleaseDate: row.USReleaseDate || row.usreleasedate,
                    IsStarting: row.IsStarting || row.isstarting
                });
            }
        });

        return res.status(200).json(Array.from(teamsMap.values()));

    } catch (error) {
        console.error(`Error fetching user teams and picks: ${error}`);
        return res.status(500).send("Internal server error");
    }
};

/**
 * Public/Peer View: Fetch all teams for a specific user ID.
 * PROTECTED: Requires a valid token, but allows viewing any valid userId.
 */
export const getTeamsByUserId = async (req: Request, res: Response) => {
    // 1. Get the target ID from the query string (?userId=X)
    const targetUserId = req.query.userId;

    if (!targetUserId) {
        return res.status(400).send("User ID is required to view a profile.");
    }

    try {
        // 2. Postgres Join Query
        // We include LeagueName so people can see which leagues their friends are in.
        const query = `
            SELECT 
                t."TeamId", 
                t."TeamName", 
                t."LeagueId",
                l."LeagueName"
            FROM "Teams" t
            LEFT JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            WHERE t."OwnerUserId" = $1
        `;

        const { rows } = await pool.query(query, [parseInt(targetUserId as string)]);

        // 3. Return an empty array if no teams, rather than a 404. 
        // This makes it easier for your Next.js frontend to map() safely.
        return res.status(200).json(rows);

    } catch (err) {
        console.error('Error fetching profile teams:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Replace a movie in a team slot (Free Agency logic).
 * Rules: Monthly limit, No premiered movies, League-wide duplicates.
 */
export const replaceMovie = async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { TeamId, TMDBId, Slot } = req.body;

    if (!TeamId || !TMDBId || !Slot) {
        return res.status(400).send("Missing TeamId, TMDBId, or Slot.");
    }

    const client = await pool.connect();

    try {
        // 1. Resolve Movie using your Postgres-ready helper
        const movie = await getMovieData(TMDBId);
        const internalMovieId = movie.MovieId || movie.movieid;

        // 2. Business Rule: Cannot sign a movie that has already released
        const today = new Date();
        const releaseDate = new Date(movie.InternationalReleaseDate || movie.internationalreleasedate);

        if (releaseDate <= today) {
            return res.status(400).send("Cannot sign a movie that has already premiered.");
        }

        // 3. Auth & League Context Check
        const teamQuery = `
            SELECT l."LeagueId", l."StartingNumber", t."OwnerUserId" 
            FROM "Teams" t 
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId" 
            WHERE t."TeamId" = $1
        `;
        const teamRes = await client.query(teamQuery, [TeamId]);
        const team = teamRes.rows[0];

        if (!team) return res.status(404).send("Team not found.");

        // Ensure the person logged in owns the team
        if ((team.OwnerUserId || team.owneruserid) !== userId) {
            return res.status(403).send("You do not have Front Office authority for this team.");
        }

        const leagueId = team.LeagueId || team.leagueid;
        const startingNumber = team.StartingNumber || team.startingnumber;
        const IsStarting = Slot <= startingNumber;

        await client.query('BEGIN');

        // 4. Monthly Cooldown Check (Postgres syntax)
        const cooldownQuery = `
            SELECT 1 FROM "TeamMovies" 
            WHERE "TeamId" = $1 
            AND EXTRACT(MONTH FROM "DateAdded") = EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR FROM "DateAdded") = EXTRACT(YEAR FROM NOW())
        `;
        const cooldownRes = await client.query(cooldownQuery, [TeamId]);
        if (cooldownRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).send("Front Office Error: You have already used your monthly free agent signing.");
        }

        // 5. Duplicate Check (League-wide)
        const dupQuery = `SELECT 1 FROM "TeamMovies" WHERE "LeagueId" = $1 AND "MovieId" = $2`;
        const dupRes = await client.query(dupQuery, [leagueId, internalMovieId]);
        if (dupRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).send("Scouting Error: That movie is already on a roster in this league.");
        }

        // 6. Execute the Swap
        // Remove old occupant
        await client.query(
            'DELETE FROM "TeamMovies" WHERE "TeamId" = $1 AND "OrderDrafted" = $2',
            [TeamId, Slot]
        );

        // Add new movie
        const insertQuery = `
            INSERT INTO "TeamMovies" ("TeamId", "MovieId", "DateAdded", "IsStarting", "OrderDrafted", "LeagueId")
            VALUES ($1, $2, NOW(), $3, $4, $5)
        `;
        await client.query(insertQuery, [TeamId, internalMovieId, IsStarting, Slot, leagueId]);

        await client.query('COMMIT');
        return res.status(200).send("Transaction Complete! Movie swapped.");

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Replace Movie Error:", error);
        return res.status(500).send(error.message || "Internal Server Error");
    } finally {
        client.release();
    }
};

/**
 * Swap two movie slots within the same team.
 * Rule: A movie cannot move from Bench to Starter if it has already premiered.
 */
export const swapMovies = async (req: Request, res: Response) => {
    const { TeamId, Slot1, Slot2 } = req.body;

    if (!TeamId || Slot1 === undefined || Slot2 === undefined) {
        return res.status(400).send("Missing TeamId, Slot1, or Slot2");
    }

    const client = await pool.connect();

    try {
        // 1. Get starting limit (and validate existence)
        const contextQuery = `
            SELECT l."StartingNumber", tm."OrderDrafted", m."InternationalReleaseDate", m."Title"
            FROM "Teams" t
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId"
            JOIN "Movies" m ON tm."MovieId" = m."MovieId"
            WHERE t."TeamId" = $1 AND (tm."OrderDrafted" = $2 OR tm."OrderDrafted" = $3)
        `;
        const contextRes = await client.query(contextQuery, [TeamId, Slot1, Slot2]);

        if (contextRes.rows.length < 2) {
            return res.status(404).send("One or both slots are empty.");
        }

        const startingLimit = contextRes.rows[0].StartingNumber || contextRes.rows[0].startingnumber;

        // 2. Perform Release Date Check (Existing logic)
        const today = new Date();
        for (const movie of contextRes.rows) {
            const current = movie.OrderDrafted || movie.orderdrafted;
            const target = current === Slot1 ? Slot2 : Slot1;
            if (current > startingLimit && target <= startingLimit) {
                if (new Date(movie.InternationalReleaseDate || movie.internationalreleasedate) <= today) {
                    return res.status(400).send(`Illegal Move: ${movie.Title} has already released.`);
                }
            }
        }

        // 3. THE SINGLE STATEMENT SWAP
        const swapQuery = `
            UPDATE "TeamMovies"
            SET 
                "OrderDrafted" = CASE 
                    WHEN "OrderDrafted" = $1 THEN $2 
                    ELSE $1 
                END,
                "IsStarting" = CASE 
                    WHEN (CASE WHEN "OrderDrafted" = $1 THEN $2 ELSE $1 END) <= $3 THEN TRUE 
                    ELSE FALSE 
                END
            WHERE "TeamId" = $4 AND "OrderDrafted" IN ($1, $2)
        `;

        await client.query(swapQuery, [Slot1, Slot2, startingLimit, TeamId]);

        return res.status(200).send("Swap successful");

    } catch (err) {
        console.error("Swap Error:", err);
        return res.status(500).send("Database error.");
    } finally {
        client.release();
    }
};

/**
 * Update an existing team (owner only).
 * Currently supports updating TeamName.
 */
export const updateTeam = async (req: Request, res: Response) => {
    // 1. Identification
    const teamId = req.query.id;
    const userId = req.user!.userId;
    const { TeamName } = req.body;

    if (!teamId) return res.status(400).send("Team ID is required");
    if (!TeamName) return res.status(400).send("No fields provided to update");

    try {
        // 2. Postgres Dynamic Update
        // Note: Using RETURNING * to replace OUTPUT INSERTED.*
        const query = `
            UPDATE "Teams"
            SET "TeamName" = $1
            WHERE "TeamId" = $2 AND "OwnerUserId" = $3
            RETURNING *;
        `;

        const { rows } = await pool.query(query, [
            TeamName,
            parseInt(teamId as string),
            userId
        ]);

        if (rows.length > 0) {
            return res.status(200).json(rows[0]);
        } else {
            return res.status(403).send("Forbidden: You are not the owner or team not found");
        }
    } catch (error) {
        console.error(`Error updating team: ${error}`);
        return res.status(500).send("Internal server error");
    }
};

/**
 * Admin Endpoint: Clear a specific roster slot for a team.
 * PROTECTED: Requires authenticateToken, requireAuth
 * Body: { TeamId, OrderDrafted, LeagueId }
 */
export const clearRosterSlot = async (req: Request, res: Response) => {
    const adminUserId = req.user!.userId; // Assuming middleware sets this
    const { TeamId, OrderDrafted, LeagueId } = req.body;

    if (!TeamId || !OrderDrafted || !LeagueId) {
        return res.status(400).send("Missing required fields.");
    }

    const client = await pool.connect();

    try {
        // 1. Verify Requesting User is the League Admin
        const adminCheck = await client.query(
            'SELECT "AdminUserId" FROM "Leagues" WHERE "LeagueId" = $1',
            [LeagueId]
        );

        if (adminCheck.rows[0]?.AdminUserId !== adminUserId) {
            return res.status(403).send("Only the league admin can clear slots.");
        }

        // 2. Delete the record
        const deleteResult = await client.query(
            'DELETE FROM "TeamMovies" WHERE "TeamId" = $1 AND "OrderDrafted" = $2 AND "LeagueId" = $3',
            [TeamId, OrderDrafted, LeagueId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).send("No movie found in that slot.");
        }

        return res.status(200).json({ success: true, message: "Slot cleared successfully." });

    } catch (error: any) {
        console.error(`Clear Slot Error: ${error.message}`);
        return res.status(500).send("Internal server error.");
    } finally {
        client.release();
    }
};