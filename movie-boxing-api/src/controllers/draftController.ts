import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';
import { getMovieData } from '../utils/helpers.js';

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
        // 1. Resolve Movie: Ensure movie exists in local DB
        const movie = await getMovieData(tmdbId);
        const internalMovieId = movie.MovieId || movie.movieid;

        // 2. Validation Query
        const validationQuery = `
            SELECT 
                (SELECT COUNT(*) FROM "TeamMovies" WHERE "LeagueId" = l."LeagueId" AND "MovieId" = $1) as "AlreadyPicked",
                (SELECT COUNT(*) FROM "TeamMovies" WHERE "TeamId" = $2) as "CurrentPicks",
                t."OwnerUserId",
                l."StartingNumber",
                l."BenchNumber",
                l."LeagueId",
                l."StartDate",
                l."EndDate",
                l."PreferredReleaseDate",
                m."USReleaseDate",
                m."InternationalReleaseDate"
            FROM "Teams" t
            JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
            JOIN "Movies" m ON m."MovieId" = $1
            WHERE t."TeamId" = $2
        `;

        const valRes = await client.query(validationQuery, [internalMovieId, TeamId]);
        const stats = valRes.rows[0];

        // 3. Early Return Validations
        if (!stats) return res.status(404).send("Team or Movie not found");
        if ((stats.OwnerUserId || stats.owneruserid) !== ownerUserId) {
            return res.status(403).send("Forbidden: You do not own this team");
        }
        if (parseInt(stats.AlreadyPicked || stats.alreadypicked) > 0) {
            return res.status(400).send("Movie already taken in this league");
        }
        
        const totalAllowed = (stats.StartingNumber || stats.startingnumber) + (stats.BenchNumber || stats.benchnumber);
        const currentCount = parseInt(stats.CurrentPicks || stats.currentpicks);
        
        if (currentCount >= totalAllowed) {
            return res.status(400).send("Roster full");
        }

        // 4. League Date Window Check
        const pref = stats.PreferredReleaseDate || stats.preferredreleasedate;
        const releaseDateStr = pref === 'us' 
            ? (stats.USReleaseDate || stats.usreleasedate) 
            : (stats.InternationalReleaseDate || stats.internationalreleasedate);
        
        const releaseDate = new Date(releaseDateStr);
        const leagueStartDate = new Date(stats.StartDate || stats.startdate);
        const leagueEndDate = new Date(stats.EndDate || stats.enddate);
        
        if (releaseDate < leagueStartDate || releaseDate > leagueEndDate) {
            return res.status(400).send("Movie release date is outside the league's active period");
        }

        // 5. Transactional Insert
        const startingNumber = stats.StartingNumber || stats.startingnumber;
        const isBench = currentCount >= startingNumber;
        const leagueId = stats.LeagueId || stats.leagueid;

        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO "TeamMovies" ("TeamId", "MovieId", "DateAdded", "IsStarting", "OrderDrafted", "LeagueId")
            VALUES (
                $1, 
                $2, 
                NOW(), 
                $3, 
                (SELECT COALESCE(MAX("OrderDrafted"), 0) + 1 FROM "TeamMovies" WHERE "TeamId" = $1), 
                $4
            )
            RETURNING *;
        `;

        const finalResult = await client.query(insertQuery, [
            TeamId,
            internalMovieId,
            !isBench,
            leagueId
        ]);

        await client.query('COMMIT');
        return res.status(201).json(finalResult.rows[0]);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Pick Error: ${error.message}`);
        return res.status(500).send("Internal server error");
    } finally {
        client.release();
    }
};