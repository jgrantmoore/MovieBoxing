import { poolPromise, sql } from "../db"; // Adjust path as needed
import { Movie } from "../models/DatabaseModels"; // Adjust path as needed
import jwt from 'jsonwebtoken';

/**
 * Verifies JWT token and returns userId.
 */
export async function verifyJwtToken(authHeader: string | null): Promise<number | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error("Unauthorized");
    }
    const token = authHeader.substring(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        return payload.userId;
    } catch (error) {
        throw new Error("Invalid token");
    }
}

/**
 * Verifies team ownership and returns league details.
 */
export async function verifyTeamOwnership(teamId: number, ownerUserId: number): Promise<{ leagueId: number; startingNumber: number; benchNumber: number }> {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('TeamId', sql.Int, teamId)
        .query(`
            SELECT t.OwnerUserId, t.LeagueId, l.StartingNumber, l.BenchNumber
            FROM Teams t
            JOIN Leagues l ON t.LeagueId = l.LeagueId
            WHERE t.TeamId = @TeamId
        `);

    if (result.recordset.length === 0) {
        throw new Error("Team not found");
    }

    const record = result.recordset[0];
    if (record.OwnerUserId !== ownerUserId) {
        throw new Error("Forbidden: You do not own this team");
    }

    return {
        leagueId: record.LeagueId,
        startingNumber: record.StartingNumber,
        benchNumber: record.BenchNumber
    };
}


/**
 * Checks if a movie is already picked in the league.
 */
export async function checkMoviePickedInLeague(leagueId: number, movieId: number): Promise<void> {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('LeagueId', sql.Int, leagueId)
        .input('MovieId', sql.Int, movieId) // Use internal MovieId
        .query(`
            SELECT MovieId FROM TeamMovies 
            WHERE LeagueId = @LeagueId AND MovieId = @MovieId
        `);

    if (result.recordset.length > 0) {
        throw new Error("Movie is already picked in this league");
    }
}

/**
 * Gets the pick count for a team.
 */
export async function getTeamPickCount(teamId: number): Promise<number> {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('TeamId', sql.Int, teamId)
        .query('SELECT COUNT(*) AS PickCount FROM TeamMovies WHERE TeamId = @TeamId');

    return result.recordset[0].PickCount;
}

/**
 * Get Movie info using TMDB id.
 * If the movie is not in the database, query TMDB and add it to the database before returning the info.
 */
export async function getMovieData(tmdbId: number): Promise<Movie> {
    const pool = await poolPromise;

    // 1. Check if movie exists in OUR DB using the External ID
    const result = await pool.request()
        .input('TMDBId', sql.Int, tmdbId)
        .query('SELECT * FROM Movies WHERE TMDBId = @TMDBId');

    if (result.recordset.length > 0) {
        return result.recordset[0]; // Returns the full object including our internal MovieId
    }

    // 2. Not found? Fetch and Create it
    return await createMovieFromTMDBId(tmdbId);
}

export async function getMovieIdByTMDBId(tmdbId: number): Promise<number> {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('TMDBId', sql.Int, tmdbId)
        .query('SELECT MovieId FROM Movies WHERE TMDBId = @TMDBId');

    if (result.recordset.length === 0) {
        throw new Error("Movie not found");
    }
    return result.recordset[0].MovieId;
}

export async function createMovieFromTMDBId(tmdbId: number): Promise<Movie> {
    const pool = await poolPromise;
    try {
        const options = { 
            method: 'GET', 
            headers: { 
                accept: 'application/json', 
                Authorization: process.env.TMDB_API_KEY
            } 
        };
        
        const [movieRes, releaseRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, options),
            fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`, options)
        ]);

        const movieData = await movieRes.json();
        const releaseData = await releaseRes.json();


        // 1. Flatten and Sort all release dates
        const allReleases = (releaseData.results || []).flatMap((r: any) =>
            r.release_dates.map((rd: any) => rd.release_date)
        );

        const sortedReleases = allReleases.sort((a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

        // 2. Logic for specific dates with absolute fallbacks to prevent NULL
        // US Release Date
        const usEntry = releaseData.results?.find((r: any) => r.iso_3166_1 === 'US');
        let usReleaseDate: string | undefined;
        if (usEntry) {
            // Look for Type 3 (Theatrical). If not found, take the first available.
            const theatrical = usEntry.release_dates.find((rd: { type: number; release_date: string }) => rd.type === 3);
            usReleaseDate = theatrical ? theatrical.release_date : usEntry.release_dates[0]?.release_date;
        }
        usReleaseDate = usReleaseDate
            || sortedReleases[0]
            || movieData.release_date
            || new Date().toISOString();

        // International Release Date (all countries, type 2 or 3, including US)
        let internationalReleaseDate: string | undefined;
        const allType2or3Dates: string[] = [];
        const allEntries = releaseData.results || [];
        for (const entry of allEntries) {
            for (const rd of entry.release_dates) {
                if ((rd.type === 2 || rd.type === 3) && rd.release_date) {
                    allType2or3Dates.push(rd.release_date);
                }
            }
        }
        if (allType2or3Dates.length > 0) {
            internationalReleaseDate = allType2or3Dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
        } else {
            // Fallback: earliest available release date from any country
            const allDates: string[] = [];
            for (const entry of allEntries) {
                for (const rd of entry.release_dates) {
                    if (rd.release_date) {
                        allDates.push(rd.release_date);
                    }
                }
            }
            if (allDates.length > 0) {
                internationalReleaseDate = allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
            }
        }
        internationalReleaseDate = internationalReleaseDate
            || sortedReleases[0]
            || movieData.release_date
            || new Date().toISOString();

        // 3. Map to your schema - UPDATED SQL QUERY
        const insertResult = await pool.request()
            .input('TMDBId', sql.Int, tmdbId)
            .input('Title', sql.NVarChar, movieData.title)
            .input('Description', sql.NVarChar, movieData.overview || "")
            .input('USReleaseDate', sql.Date, usReleaseDate)
            .input('InternationalReleaseDate', sql.Date, internationalReleaseDate)
            .input('PosterUrl', sql.NVarChar, movieData.poster_path)
            .input('Budget', sql.Decimal(18, 2), movieData.budget || 0)
            .input('BoxOffice', sql.Decimal(18, 2), movieData.revenue || 0)
            .input('Status', sql.NVarChar, movieData.status)
            .query(`
                INSERT INTO Movies (
                    TMDBId, 
                    Title, 
                    Description, 
                    USReleaseDate, 
                    InternationalReleaseDate, 
                    PosterUrl, 
                    Budget, 
                    BoxOffice, 
                    Status,
                    DataRecent
                )
                OUTPUT INSERTED.*
                VALUES (
                    @TMDBId, 
                    @Title, 
                    @Description, 
                    @USReleaseDate, 
                    @InternationalReleaseDate, 
                    @PosterUrl, 
                    @Budget, 
                    @BoxOffice, 
                    @Status,
                    1
                )
            `);

        return insertResult.recordset[0];

    } catch (err) {
        throw new Error("Error fetching/saving movie: " + err);
    }
}