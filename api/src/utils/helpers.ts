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
        const options = { method: 'GET', headers: { accept: 'application/json', Authorization: process.env.TMDB_API_KEY } }; 
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`, options);
        const release_date_response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`, options);
        const movieData = await response.json();
        const releaseData = await release_date_response.json();
        
        // Extract US and International release dates
        const usRelease = releaseData.results.find((r: any) => r.iso_3166_1 === 'US');
        const internationalRelease = releaseData.results.find((r: any) => r.iso_3166_1 !== 'US');

        // 3. Map to your schema exactly
        const insertResult = await pool.request()
            .input('TMDBId', sql.Int, tmdbId)
            .input('Title', sql.NVarChar, movieData.title)
            .input('Description', sql.NVarChar, movieData.overview)
            .input('USReleaseDate', sql.Date, usRelease ? usRelease.release_dates[0].release_date : null)
            .input('InternationalReleaseDate', sql.Date, internationalRelease ? internationalRelease.release_dates[0].release_date : null)
            .input('ImageUrl', sql.NVarChar, movieData.poster_path)
            .input('Budget', sql.Decimal, movieData.budget)
            .input('BoxOffice', sql.Decimal, movieData.revenue)
            .input('Status', sql.NVarChar, movieData.status)
            .query(`
                INSERT INTO Movies (TMDBId, Title, USReleaseDate, ImageUrl, Budget, BoxOffice, Status)
                OUTPUT INSERTED.*
                VALUES (@TMDBId, @Title, @USReleaseDate, @ImageUrl, @Budget, @BoxOffice, @Status)
            `);

        return insertResult.recordset[0]; // This now contains the newly created MovieId

    } catch (err) {
        throw new Error("Error fetching/saving movie");
    }
}