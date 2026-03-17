import { app, InvocationContext, Timer } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { Movie } from "../../models/DatabaseModels";


export async function boxOfficeUpdate(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Timer function processed request.');
    const pool = await poolPromise;
        
    const result = await pool.request().query<Movie>('SELECT * FROM Movies');
    
    const movies: Movie[] = result.recordset;
    
    for (const movie of movies) {
        try {
            const options = { method: 'GET', headers: { accept: 'application/json', Authorization: process.env.TMDB_API_KEY } }; 
            const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.TMDBId}`, options);
            const movieData = await response.json();
            
            // Only update if the box office value has changed or is missing (to avoid unnecessary DB writes)
            if (movieData.revenue !== movie.BoxOffice) {
                await pool.request()
                    .input('TMDBId', sql.Int, movie.TMDBId)
                    .input('BoxOffice', sql.Decimal, movieData.revenue)
                    .query(`
                        UPDATE Movies SET BoxOffice = @BoxOffice WHERE TMDBId = @TMDBId
                    `);
            }
        } catch (err) {
            context.log(`Error updating movie ${movie.TMDBId}: ${err}`);
        }
        
        // Add a 300ms delay between requests to respect TMDB rate limits (40 per 10s)
        await new Promise(resolve => setTimeout(resolve, 300));
    }

}

app.timer('boxOfficeUpdate', {
    schedule: '0 0 2 * * *',
    handler: boxOfficeUpdate
});
