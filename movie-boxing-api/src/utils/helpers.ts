import { pool } from '../config/db.js';

/**
 * Verifies team ownership and returns league details.
 */
export async function verifyTeamOwnership(teamId: number, ownerUserId: number) {
    // In Postgres, use double quotes for MixedCase column/table names
    const query = `
        SELECT t."OwnerUserId", t."LeagueId", l."StartingNumber", l."BenchNumber"
        FROM "Teams" t
        JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
        WHERE t."TeamId" = $1
    `;
    
    const { rows } = await pool.query(query, [teamId]);

    if (rows.length === 0) {
        throw new Error("Team not found");
    }

    const record = rows[0];
    // Check both potential casings from the DB
    const recordOwnerId = record.OwnerUserId || record.owneruserid;

    if (recordOwnerId !== ownerUserId) {
        throw new Error("Forbidden: You do not own this team");
    }

    return {
        leagueId: record.LeagueId || record.leagueid,
        startingNumber: record.StartingNumber || record.startingnumber,
        benchNumber: record.BenchNumber || record.benchnumber
    };
}

/**
 * Checks if a movie is already picked in the league.
 */
export async function checkMoviePickedInLeague(leagueId: number, movieId: number): Promise<void> {
    const query = `
        SELECT "MovieId" FROM "TeamMovies" 
        WHERE "LeagueId" = $1 AND "MovieId" = $2
    `;
    const { rows } = await pool.query(query, [leagueId, movieId]);

    if (rows.length > 0) {
        throw new Error("Movie is already picked in this league");
    }
}

/**
 * Gets the pick count for a team.
 */
export async function getTeamPickCount(teamId: number): Promise<number> {
    const query = 'SELECT COUNT(*) AS "PickCount" FROM "TeamMovies" WHERE "TeamId" = $1';
    const { rows } = await pool.query(query, [teamId]);
    
    // Postgres returns COUNT as a string
    return parseInt(rows[0].PickCount || rows[0].pickcount);
}

/**
 * Get Movie info using TMDB id.
 */
export async function getMovieData(tmdbId: number) {
    const query = 'SELECT * FROM "Movies" WHERE "TMDBId" = $1';
    const { rows } = await pool.query(query, [tmdbId]);

    if (rows.length > 0) {
        return rows[0];
    }

    return await createMovieFromTMDBId(tmdbId);
}

export async function getMovieIdByTMDBId(tmdbId: number): Promise<number> {
    const query = 'SELECT "MovieId" FROM "Movies" WHERE "TMDBId" = $1';
    const { rows } = await pool.query(query, [tmdbId]);

    if (rows.length === 0) {
        throw new Error("Movie not found");
    }
    return rows[0].MovieId || rows[0].movieid;
}

/**
 * TMDB Integration: Fetch and Save to Postgres
 */
export async function createMovieFromTMDBId(tmdbId: number) {
    try {
        const options = { 
            method: 'GET', 
            headers: { 
                accept: 'application/json', 
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`
            } 
        };
        
        const [movieRes, releaseRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, options),
            fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`, options)
        ]);

        const movieData: any = await movieRes.json();
        const releaseData: any = await releaseRes.json();

        // --- Release Date Logic (Same as your original) ---
        const allReleases = (releaseData.results || []).flatMap((r: any) =>
            r.release_dates.map((rd: any) => rd.release_date)
        );
        const sortedReleases = allReleases.sort((a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

        const usEntry = releaseData.results?.find((r: any) => r.iso_3166_1 === 'US');
        let usReleaseDate = usEntry?.release_dates.find((rd: any) => rd.type === 3)?.release_date 
                           || usEntry?.release_dates[0]?.release_date 
                           || sortedReleases[0] || movieData.release_date || new Date().toISOString();

        let internationalReleaseDate: string;
        const allType2or3Dates = (releaseData.results || []).flatMap((entry: any) => 
            entry.release_dates.filter((rd: any) => rd.type === 2 || rd.type === 3).map((rd: any) => rd.release_date)
        );

        if (allType2or3Dates.length > 0) {
            internationalReleaseDate = allType2or3Dates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0];
        } else {
            internationalReleaseDate = sortedReleases[0] || movieData.release_date || new Date().toISOString();
        }

        // --- Postgres Insert ---
        const insertQuery = `
            INSERT INTO "Movies" (
                "TMDBId", "Title", "Description", "USReleaseDate", 
                "InternationalReleaseDate", "PosterUrl", "Budget", 
                "BoxOffice", "Status", "DataRecent"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;

        const values = [
            tmdbId,
            movieData.title,
            movieData.overview || "",
            new Date(usReleaseDate),
            new Date(internationalReleaseDate),
            movieData.poster_path,
            movieData.budget || 0,
            movieData.revenue || 0,
            movieData.status,
            1 // DataRecent
        ];

        const { rows } = await pool.query(insertQuery, values);
        return rows[0];

    } catch (err) {
        throw new Error("Error fetching/saving movie: " + err);
    }
}