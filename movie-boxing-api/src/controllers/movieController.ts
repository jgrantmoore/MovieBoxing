import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';
import { getMovieData } from '../utils/helpers.js';
import { syncMovieData } from '../services/movieService.js';

/**
 * Get Movie info using internal ID or TMDB id.
 * If fetching by TMDB and not in DB, it triggers the fetch-and-save flow.
 * PUBLIC
 */
export const getMovieInfo = async (req: Request, res: Response) => {
    const idParam = req.query.id as string;
    const isTmdb = req.query.tmdb === 'true';

    if (!idParam) {
        return res.status(400).send("ID is required");
    }

    const id = parseInt(idParam);

    try {
        let movie: any;

        if (isTmdb) {
            // Your helper likely handles its own pool connection/logic.
            // Ensure getMovieData is updated to use the new Postgres pool!
            movie = await getMovieData(id);
        } else {
            // Standard internal lookup
            const query = `SELECT * FROM "Movies" WHERE "MovieId" = $1`;
            const { rows } = await pool.query(query, [id]);
            movie = rows[0];
        }

        if (!movie) {
            return res.status(404).send("Movie not found");
        }

        return res.status(200).json(movie);
    } catch (err) {
        console.error('Error fetching movie info:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Get all movies in the global library.
 * PUBLIC
 */
export const getMovies = async (req: Request, res: Response) => {
    try {
        // Querying the full Movies table
        // We use double quotes for the table name to match your DBeaver migration
        const query = 'SELECT * FROM "Movies"';
        const { rows } = await pool.query(query);

        // Standard Postgres return is an array of objects
        return res.status(200).json(rows);

    } catch (err) {
        console.error('Database query failed:', err);
        return res.status(500).send("Internal Server Error");
    }
};

/**
 * Global update for all movies in the DB.
 * Syncs Box Office and Release Dates from TMDB.
 */
export const localBoxOfficeUpdate = async (req: Request, res: Response) => {
    // Run the service logic
    await syncMovieData(); 
    return res.status(200).send("Update manually triggered and completed.");
};

/**
 * Search TMDB for movies and filter based on league dates.
 * Performs a secondary fetch for full movie details (like budget).
 */
export const searchMovies = async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const { StartDate, EndDate } = req.body;

    if (!query) {
        return res.status(400).send("Query parameter 'q' is required");
    }

    const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${process.env.TMDB_API_KEY}`
    };

    try {
        // 1. Search for movies matching the title
        const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
        const searchRes = await fetch(searchUrl, { method: 'GET', headers });
        const searchData: any = await searchRes.json();
        const rawResults = searchData.results || [];

        // 2. Filter by League Dates
        const filteredList = rawResults.filter((movie: any) => {
            if (!movie.release_date) return false;
            const releaseDate = new Date(movie.release_date);
            
            const afterStart = StartDate ? releaseDate >= new Date(StartDate) : true;
            const beforeEnd = EndDate ? releaseDate <= new Date(EndDate) : true;
            
            return afterStart && beforeEnd;
        });

        // 3. Fetch Full Details in parallel
        // TMDB allows up to 40 reqs/10s, so Promise.all is fine for a single search result set (usually ~20 movies)
        const fullDetailResults = await Promise.all(
            filteredList.map(async (movie: any) => {
                const detailUrl = `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`;
                const detailRes = await fetch(detailUrl, { method: 'GET', headers });
                return await detailRes.json();
            })
        );

        return res.status(200).json(fullDetailResults);

    } catch (error) {
        console.error("Detailed Search Failed:", error);
        return res.status(500).send("Internal Server Error");
    }
};