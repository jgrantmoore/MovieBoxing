import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';
import * as bcrypt from 'bcrypt';
import { snapshotEndingLeagues } from '../services/leagueService.js';

/**
 * Create a new league and automatically assign the creator a team.
 * PROTECTED: Requires authenticateToken middleware
 */
export const createLeague = async (req: Request, res: Response) => {
    const adminUserId = req.user!.userId;
    const body = req.body;

    const requiredFields = [
        'LeagueName', 'StartDate', 'EndDate', 'StartingNumber',
        'BenchNumber', 'PreferredReleaseDate', 'FreeAgentsAllowed'
    ];

    for (const field of requiredFields) {
        if (body[field] === undefined || body[field] === null) {
            return res.status(400).send(`Missing required field: ${field}`);
        }
    }

    const client = await pool.connect();
    try {
        let passwordHash: string | null = null;
        if (body.JoinPassword) {
            passwordHash = await bcrypt.hash(body.JoinPassword, 12);
        }

        await client.query('BEGIN');

        const leagueQuery = `
            INSERT INTO "Leagues" (
                "LeagueName", "AdminUserId", "StartDate", "EndDate", 
                "StartingNumber", "BenchNumber", "JoinPasswordHash", 
                "PreferredReleaseDate", "FreeAgentsAllowed"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING "LeagueId";
        `;

        const leagueValues = [
            body.LeagueName, adminUserId, new Date(body.StartDate),
            new Date(body.EndDate), body.StartingNumber, body.BenchNumber,
            passwordHash, body.PreferredReleaseDate, body.FreeAgentsAllowed
        ];

        const leagueResult = await client.query(leagueQuery, leagueValues);
        const leagueId = leagueResult.rows[0].LeagueId || leagueResult.rows[0].leagueid;

        const teamName = `${body.LeagueName} Admin`;
        await client.query(
            'INSERT INTO "Teams" ("LeagueId", "OwnerUserId", "TeamName") VALUES ($1, $2, $3)',
            [leagueId, adminUserId, teamName]
        );

        await client.query('COMMIT');
        return res.status(201).json({ success: true, league: leagueId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Database Error in CreateLeague: ${error}`);
        return res.status(500).send("Internal server error occurred.");
    } finally {
        client.release();
    }
};

/**
 * Delete a league and all associated data.
 * PROTECTED: Requires authenticateToken middleware
 */
export const deleteLeague = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    const userId = req.user!.userId;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const adminCheck = await client.query(
            'SELECT "AdminUserId" FROM "Leagues" WHERE "LeagueId" = $1',
            [leagueId]
        );

        if (adminCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send("League not found");
        }

        const leagueAdminId = adminCheck.rows[0].AdminUserId || adminCheck.rows[0].adminuserid;

        if (leagueAdminId !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).send("Only the Commissioner can scrap this league.");
        }

        await client.query(`
            DELETE FROM "TradeProposals" 
            WHERE "ProposingTeamId" IN (SELECT "TeamId" FROM "Teams" WHERE "LeagueId" = $1)
               OR "TargetTeamId" IN (SELECT "TeamId" FROM "Teams" WHERE "LeagueId" = $1)
        `, [leagueId]);

        await client.query('DELETE FROM "TeamMovies" WHERE "LeagueId" = $1', [leagueId]);
        await client.query('DELETE FROM "DraftPlans" WHERE "LeagueId" = $1', [leagueId]);
        await client.query('DELETE FROM "Teams" WHERE "LeagueId" = $1', [leagueId]);
        await client.query('DELETE FROM "Leagues" WHERE "LeagueId" = $1', [leagueId]);

        await client.query('COMMIT');
        return res.status(200).send("League and all associated data purged.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error purging league: ${error}`);
        res.status(500).send("Internal server error during purge.");
    } finally {
        client.release();
    }
};

/**
 * Get all leagues the user is involved in.
 * PROTECTED: Requires authenticateToken middleware
 */
export const getMyLeagues = async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    try {
        const query = `
            SELECT DISTINCT
                l."LeagueId", l."LeagueName", u."DisplayName" AS "AdminDisplayName",
                l."StartDate", l."EndDate", l."StartingNumber", 
                l."BenchNumber", l."PreferredReleaseDate", l."FreeAgentsAllowed"
            FROM "Leagues" l
            INNER JOIN "Users" u ON l."AdminUserId" = u."UserId"
            LEFT JOIN "Teams" t ON l."LeagueId" = t."LeagueId"
            WHERE l."AdminUserId" = $1 OR t."OwnerUserId" = $1
        `;
        const { rows } = await pool.query(query, [userId]);
        return rows.length > 0 ? res.status(200).json(rows) : res.status(404).send("No leagues found");
    } catch (error) {
        console.error("Error fetching user leagues:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Get detailed league data including teams and picks.
 * MIXED: Works for both logged in and anonymous users.
 */
export const getLeague = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    if (!leagueId) return res.status(400).send("League ID is required");

    const userId = req.user?.userId || -1;

    try {
        const query = `
            SELECT 
                l.*, 
                admin_u."DisplayName" AS "AdminName",
                winner_u."DisplayName" AS "LeagueWinnerName",
                t."TeamId", t."TeamName", t."DraftOrder", 
                u."UserId" as "OwnerUserId", u."DisplayName" AS "OwnerName",
                m."MovieId", m."Title" AS "MovieTitle", m."PosterUrl", m."TMDBId",
                m."InternationalReleaseDate", p."OrderDrafted", p."DateAdded",
                -- Use frozen box office if snapshot exists, otherwise live data
                COALESCE(lms."FrozenBoxOffice", m."BoxOffice") AS "DisplayBoxOffice"
            FROM "Leagues" l
            JOIN "Users" admin_u ON l."AdminUserId" = admin_u."UserId" 
            LEFT JOIN "Users" winner_u ON l."LeagueWinnerId" = winner_u."UserId"
            JOIN "Teams" t ON l."LeagueId" = t."LeagueId"
            JOIN "Users" u ON t."OwnerUserId" = u."UserId"
            LEFT JOIN "TeamMovies" p ON t."TeamId" = p."TeamId"
            LEFT JOIN "Movies" m ON p."MovieId" = m."MovieId"
            LEFT JOIN "LeagueMovieSnapshots" lms ON m."MovieId" = lms."MovieId" 
                AND l."EndDate"::date = lms."SnapshotDate"
            WHERE l."LeagueId" = $1
            ORDER BY t."TeamName" ASC, p."OrderDrafted" ASC;
        `;

        const { rows } = await pool.query(query, [parseInt(leagueId as string)]);
        if (rows.length === 0) return res.status(404).send("League not found");

        const firstRow = rows[0];

        // Format base league data
        const leagueData: any = {
            LeagueId: firstRow.LeagueId || firstRow.leagueid,
            LeagueName: firstRow.LeagueName || firstRow.leaguename,
            AdminName: firstRow.AdminName || firstRow.adminname,
            StartDate: firstRow.StartDate || firstRow.startdate,
            EndDate: firstRow.EndDate || firstRow.enddate,
            HasDrafted: firstRow.HasDrafted || firstRow.hasdrafted,
            IsDrafting: firstRow.IsDrafting || firstRow.isdrafting,
            IsOver: (firstRow.LeagueWinnerId || firstRow.leaguewinnerid) !== null,
            WinnerId: firstRow.LeagueWinnerId || firstRow.leaguewinnerid,
            WinnerName: firstRow.LeagueWinnerName || firstRow.leaguewinnername,
            isPrivate: (firstRow.JoinPasswordHash || firstRow.joinpasswordhash) != null,
            DraftUsersTurn: firstRow.DraftUsersTurn || firstRow.draftusersturn,
            Rules: {
                Starting: firstRow.StartingNumber || firstRow.startingnumber,
                Bench: firstRow.BenchNumber || firstRow.benchnumber,
                FreeAgents: firstRow.FreeAgentsAllowed || firstRow.freeagentsallowed
            },
            Teams: []
        };

        // Auth-specific logic
        if (userId > 0) {
            leagueData.Joined = rows.some(row => (row.OwnerUserId || row.owneruserid) === userId);
            leagueData.isAdmin = (firstRow.AdminUserId || firstRow.adminuserid) === userId;
        }

        // Aggregate Teams and Picks
        rows.forEach(row => {
            const rowTeamId = row.TeamId || row.teamid;
            let team = leagueData.Teams.find((t: any) => t.TeamId === rowTeamId);

            if (!team) {
                team = {
                    TeamId: rowTeamId,
                    TeamName: row.TeamName || row.teamname,
                    OwnerUserId: row.OwnerUserId || row.owneruserid,
                    Owner: row.OwnerName || row.ownername,
                    DraftOrder: row.DraftOrder || row.draftorder,
                    Picks: []
                };
                leagueData.Teams.push(team);
            }

            const rowMovieId = row.MovieId || row.movieid;
            if (rowMovieId) {
                team.Picks.push({
                    MovieId: rowMovieId,
                    Title: row.MovieTitle || row.movietitle,
                    BoxOffice: row.DisplayBoxOffice || row.displayboxoffice,
                    PosterUrl: row.PosterUrl || row.posterurl,
                    OrderDrafted: row.OrderDrafted || row.orderdrafted,
                    ReleaseDate: row.InternationalReleaseDate || row.internationalreleasedate,
                    TMDBId: row.TMDBId || row.tmdbid
                });
            }
        });

        return res.status(200).json(leagueData);
    } catch (error) {
        console.error("Detailed League Fetch Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Get the current standings for a league.
 * PUBLIC
 */
export const getLeaderboard = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    if (!leagueId) return res.status(400).send("League ID is required");

    try {
        const query = `
            WITH TeamTotals AS (
                SELECT 
                    t."TeamId",
                    t."TeamName",
                    u."DisplayName" as "OwnerName",
                    SUM(COALESCE(m."BoxOffice", 0)) as "TotalRevenue",
                    -- Fix: Changed tm."IsStarting" = 1 to tm."IsStarting" = true
                    COUNT(CASE WHEN m."InternationalReleaseDate" <= NOW() AND tm."IsStarting" = true THEN 1 END) as "ReleasedCount"
                FROM "Teams" t
                JOIN "Users" u ON t."OwnerUserId" = u."UserId"
                LEFT JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId" AND tm."IsStarting" = true
                LEFT JOIN "Movies" m ON tm."MovieId" = m."MovieId"
                WHERE t."LeagueId" = $1
                GROUP BY t."TeamId", t."TeamName", u."DisplayName"
            ),
            MVPPicks AS (
                SELECT 
                    tm."TeamId",
                    m."Title" as "TopMovie",
                    ROW_NUMBER() OVER (PARTITION BY tm."TeamId" ORDER BY m."BoxOffice" DESC) as "Rank"
                FROM "TeamMovies" tm
                JOIN "Movies" m ON tm."MovieId" = m."MovieId"
                -- Fix: Changed tm."IsStarting" = 1 to tm."IsStarting" = true
                WHERE tm."IsStarting" = true 
            )
            SELECT 
                tt.*,
                COALESCE(mp."TopMovie", 'None') as "TopMovie"
            FROM TeamTotals tt
            LEFT JOIN MVPPicks mp ON tt."TeamId" = mp."TeamId" AND mp."Rank" = 1
            ORDER BY tt."TotalRevenue" DESC, tt."ReleasedCount" DESC;
        `;

        const { rows } = await pool.query(query, [parseInt(leagueId as string)]);
        return res.status(200).json(rows);
    } catch (error) {
        console.error("Leaderboard Fetch Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Get basic meta-info about a league.
 * MIXED: Works for both logged-in and anonymous users.
 */
export const getLeagueInfo = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    if (!leagueId) return res.status(400).send("League ID is required");

    // 1. Soft Auth: Middleware handles this. 
    // If user is not logged in, userId is -1.
    const userId = req.user?.userId || -1;

    try {
        const query = `
            SELECT 
                l."LeagueId",
                l."LeagueName",
                l."AdminUserId",
                u."DisplayName" AS "AdminDisplayName", 
                l."StartDate",
                l."EndDate",
                l."StartingNumber", 
                l."BenchNumber",
                l."PreferredReleaseDate",
                l."FreeAgentsAllowed",
                l."HasDrafted",
                l."IsDrafting",
                l."JoinPasswordHash",
                l."LeagueWinnerId",
                winner_u."DisplayName" AS "LeagueWinnerName",
                (SELECT COUNT(1) FROM "Teams" t WHERE t."LeagueId" = l."LeagueId" AND t."OwnerUserId" = $2) AS "IsJoined"
            FROM "Leagues" l
            INNER JOIN "Users" u ON l."AdminUserId" = u."UserId"
            LEFT JOIN "Users" winner_u ON l."LeagueWinnerId" = winner_u."UserId"
            WHERE l."LeagueId" = $1
        `;

        const { rows } = await pool.query(query, [parseInt(leagueId as string), userId]);

        if (rows.length === 0) {
            return res.status(404).send("League not found");
        }

        const row = rows[0];
        const rowAdminId = row.AdminUserId || row.adminuserid;

        // 2. Format the response to match your standard League object
        const response = {
            LeagueId: row.LeagueId || row.leagueid,
            LeagueName: row.LeagueName || row.leaguename,
            AdminName: row.AdminDisplayName || row.admindisplayname,
            StartDate: row.StartDate || row.startdate,
            EndDate: row.EndDate || row.enddate,
            HasDrafted: row.HasDrafted || row.hasdrafted,
            IsDrafting: row.IsDrafting || row.isdrafting,
            isPrivate: (row.JoinPasswordHash || row.joinpasswordhash) != null,
            LeagueWinnerId: row.LeagueWinnerId || row.leaguewinnerid,
            LeagueWinnerName: row.LeagueWinnerName || row.leaguewinnername,
            Rules: {
                Starting: row.StartingNumber || row.startingnumber,
                Bench: row.BenchNumber || row.benchnumber,
                FreeAgents: row.FreeAgentsAllowed || row.freeagentsallowed,
                PreferredRelease: row.PreferredReleaseDate || row.preferredreleasedate
            },
            // 3. Add auth-specific fields only if user is logged in
            ...(userId > 0 && {
                isJoined: parseInt(row.IsJoined || row.isjoined) > 0,
                isAdmin: rowAdminId === userId
            })
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error("League Info Fetch Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Get all movies drafted in the league, ordered by their release date.
 * PUBLIC
 */
export const getLeagueReleaseOrder = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    if (!leagueId) return res.status(400).send("League ID is required");

    try {
        const query = `
            SELECT DISTINCT
                m."MovieId", m."Title", m."BoxOffice", m."PosterUrl",
                m."InternationalReleaseDate", t."TeamName", u."DisplayName" as "OwnerName"
            FROM "Leagues" l
            JOIN "Teams" t ON l."LeagueId" = t."LeagueId"
            JOIN "Users" u ON t."OwnerUserId" = u."UserId"
            JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId"
            JOIN "Movies" m ON tm."MovieId" = m."MovieId"
            WHERE l."LeagueId" = $1
            ORDER BY m."InternationalReleaseDate" ASC;
        `;

        const { rows } = await pool.query(query, [parseInt(leagueId as string)]);
        const movies = rows.map(row => ({
            MovieId: row.MovieId || row.movieid,
            Title: row.Title || row.title,
            BoxOffice: row.BoxOffice || row.boxoffice,
            PosterUrl: row.PosterUrl || row.posterurl,
            ReleaseDate: row.InternationalReleaseDate || row.internationalreleasedate,
            OwnedBy: {
                TeamName: row.TeamName || row.teamname,
                Owner: row.OwnerName || row.ownername
            }
        }));
        return res.status(200).json(movies);
    } catch (error) {
        console.error("Get League Movies Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Search for Leagues by name with Team Count and User Status.
 * MIXED: Works for both logged in and anonymous users.
 */
export const searchLeagues = async (req: Request, res: Response) => {
    // 1. Extract query parameter '?q=searchterm'
    const searchQuery = req.query.q || "";

    // 2. Soft Auth: Middleware handles this. 
    // If the route is public, req.user will be undefined.
    const userId = req.user?.userId || -1;

    try {
        // 3. Postgres Query
        // Using ILIKE for case-insensitive searching
        const query = `
            SELECT 
                l."LeagueId", 
                l."LeagueName", 
                l."AdminUserId",
                u."DisplayName" AS "AdminDisplayName",
                l."StartDate", 
                l."EndDate", 
                l."StartingNumber", 
                l."BenchNumber", 
                l."FreeAgentsAllowed",
                l."HasDrafted",
                l."IsDrafting",
                l."JoinPasswordHash",
                COUNT(t."TeamId") AS "TeamCount",
                -- Check if the current user has a team in this league
                MAX(CASE WHEN t."OwnerUserId" = $2 THEN 1 ELSE 0 END) AS "IsJoined"
            FROM "Leagues" l
            INNER JOIN "Users" u ON l."AdminUserId" = u."UserId"
            LEFT JOIN "Teams" t ON l."LeagueId" = t."LeagueId"
            WHERE l."LeagueName" ILIKE $1
            GROUP BY 
                l."LeagueId", l."LeagueName", l."AdminUserId", u."DisplayName",
                l."StartDate", l."EndDate", l."StartingNumber", l."BenchNumber", 
                l."FreeAgentsAllowed", l."HasDrafted", l."IsDrafting", l."JoinPasswordHash"
            ORDER BY l."StartDate" DESC;
        `;

        const { rows } = await pool.query(query, [`%${searchQuery}%`, userId]);

        // 4. Map the results
        const leagues = rows.map(row => {
            const rowAdminId = row.AdminUserId || row.adminuserid;

            return {
                LeagueId: row.LeagueId || row.leagueid,
                LeagueName: row.LeagueName || row.leaguename,
                StartDate: row.StartDate || row.startdate,
                EndDate: row.EndDate || row.enddate,
                HasDrafted: row.HasDrafted || row.hasdrafted,
                IsDrafting: row.IsDrafting || row.isdrafting,
                isPrivate: (row.JoinPasswordHash || row.joinpasswordhash) != null,
                AdminName: row.AdminDisplayName || row.admindisplayname,
                TeamCount: parseInt(row.TeamCount || row.teamcount),
                Rules: {
                    Starting: row.StartingNumber || row.startingnumber,
                    Bench: row.BenchNumber || row.benchnumber,
                    FreeAgents: row.FreeAgentsAllowed || row.freeagentsallowed
                },
                // Add auth-specific fields only if user is logged in
                ...(userId > 0 && {
                    isJoined: (row.IsJoined || row.isjoined) === 1,
                    isAdmin: rowAdminId === userId
                })
            };
        });

        return res.status(200).json(leagues);

    } catch (error) {
        console.error("Search Leagues Error:", error);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Update an existing league (admin only).
 * Rules: EndDate cannot be in the past.
 */
export const updateLeague = async (req: Request, res: Response) => {
    const leagueId = req.query.id;
    if (!leagueId) return res.status(400).send("League ID is required");

    const userId = req.user!.userId;
    const body = req.body;

    if (Object.keys(body).length === 0) {
        return res.status(400).send("No fields to update");
    }

    try {
        // Date validation
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize to start of today

        

        if (body.EndDate !== undefined) {
            const newEndDate = new Date(body.EndDate);

            if (newEndDate < now) {
                return res.status(400).send("Validation Error: League End Date cannot be in the past.");
            }

            // Optional: If StartDate is also in the body, check the range
            if (body.StartDate !== undefined) {
                if (new Date(body.EndDate) < new Date(body.StartDate)) {
                    return res.status(400).send("Validation Error: End Date must be after Start Date.");
                }
            } else {
                // Compare to the current startdate since it's not being updated
                const currentStartDateResult = await pool.query(
                    'SELECT "StartDate" FROM "Leagues" WHERE "LeagueId" = $1',
                    [leagueId]
                );

                if (currentStartDateResult.rows.length === 0) {
                    return res.status(404).send("League not found");
                }

                const currentStartDate = currentStartDateResult.rows[0].StartDate || currentStartDateResult.rows[0].startdate;

                if (currentStartDate > newEndDate) {
                    return res.status(400).send("Validation Error: End Date must be after the current Start Date.");
                }
            }
        }

        if (body.StartDate !== undefined) {
            const newStartDate = new Date(body.StartDate);

            if (newStartDate < now) {
                return res.status(400).send("Validation Error: League Start Date cannot be in the past.");
            }

            // Optional: If StartDate is also in the body, check the range
            if (body.EndDate !== undefined) {
                if (new Date(body.EndDate) < new Date(body.StartDate)) {
                    return res.status(400).send("Validation Error: End Date must be after Start Date.");
                }
            } else {
                // Compare to the current enddate since it's not being updated
                const currentEndDateResult = await pool.query(
                    'SELECT "EndDate" FROM "Leagues" WHERE "LeagueId" = $1',
                    [leagueId]
                );

                if (currentEndDateResult.rows.length === 0) {
                    return res.status(404).send("League not found");
                }

                const currentEndDate = currentEndDateResult.rows[0].EndDate || currentEndDateResult.rows[0].enddate;

                if (newStartDate > currentEndDate) {
                    return res.status(400).send("Validation Error: Start Date must be before the current End Date.");
                }
            }
        }


        const setParts: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (body.LeagueName !== undefined) {
            setParts.push(`"LeagueName" = $${paramIndex++}`);
            values.push(body.LeagueName);
        }
        if (body.StartDate !== undefined) {
            setParts.push(`"StartDate" = $${paramIndex++}`);
            values.push(new Date(body.StartDate));
        }
        if (body.EndDate !== undefined) {
            setParts.push(`"EndDate" = $${paramIndex++}`);
            values.push(new Date(body.EndDate));
        }
        if (body.StartingNumber !== undefined) {
            setParts.push(`"StartingNumber" = $${paramIndex++}`);
            values.push(body.StartingNumber);
        }
        if (body.BenchNumber !== undefined) {
            setParts.push(`"BenchNumber" = $${paramIndex++}`);
            values.push(body.BenchNumber);
        }
        if (body.Public == true) {
            setParts.push(`"JoinPasswordHash" = NULL`);
        }
        if (body.JoinPassword !== undefined) {
            const saltRounds = 12;
            const hash = await bcrypt.hash(body.JoinPassword, saltRounds);
            setParts.push(`"JoinPasswordHash" = $${paramIndex++}`);
            values.push(hash);
        }
        if (body.PreferredReleaseDate !== undefined) {
            setParts.push(`"PreferredReleaseDate" = $${paramIndex++}`);
            values.push(body.PreferredReleaseDate);
        }
        if (body.FreeAgentsAllowed !== undefined) {
            setParts.push(`"FreeAgentsAllowed" = $${paramIndex++}`);
            values.push(body.FreeAgentsAllowed);
        }

        if (setParts.length === 0) {
            return res.status(400).send("No valid fields to update");
        }

        const leagueIdParam = paramIndex++;
        const userIdParam = paramIndex++;
        values.push(parseInt(leagueId as string));
        values.push(userId);

        const query = `
            UPDATE "Leagues"
            SET ${setParts.join(', ')}
            WHERE "LeagueId" = $${leagueIdParam} AND "AdminUserId" = $${userIdParam}
            RETURNING *;
        `;

        const { rows } = await pool.query(query, values);

        if (rows.length > 0) {
            return res.status(200).json(rows[0]);
        } else {
            return res.status(403).send("Forbidden: You are not the admin or league not found");
        }
    } catch (error) {
        console.error(`Error updating league: ${error}`);
        return res.status(500).send("Internal server error");
    }
};

/**
 * Manually trigger a snapshot of ending leagues.
 * THIS IS A TEST ENDPOINT
 */
export const leagueSnapshotUpdate = async (req: Request, res: Response) => {
    // Run the service logic
    await snapshotEndingLeagues();
    return res.status(200).send("Snapshot manually triggered and completed.");
};