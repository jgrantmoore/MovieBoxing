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
            // Fetch movie details with release_dates
            const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.TMDBId}?append_to_response=release_dates`, options);
            const movieData = await response.json();

            // --- US Release Date (Type 3 logic) ---
            let usReleaseDate: string | undefined;
            const usEntry = movieData.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
            if (usEntry) {
                const theatrical = usEntry.release_dates.find((rd: { type: number; release_date: string }) => rd.type === 3);
                usReleaseDate = theatrical ? theatrical.release_date : usEntry.release_dates[0]?.release_date;
            }
            usReleaseDate = usReleaseDate || movieData.release_date || new Date().toISOString();

            // Only update if the box office or US release date has changed
            const shouldUpdateBoxOffice = movieData.revenue !== movie.BoxOffice;
            const shouldUpdateReleaseDate = usReleaseDate && usReleaseDate !== movie.DomesticReleaseDate;

            if (shouldUpdateBoxOffice || shouldUpdateReleaseDate) {
                const req = pool.request()
                    .input('TMDBId', sql.Int, movie.TMDBId)
                    .input('BoxOffice', sql.Decimal, movieData.revenue);
                if (shouldUpdateReleaseDate) {
                    req.input('DomesticReleaseDate', sql.Date, usReleaseDate);
                }
                await req.query(`
                    UPDATE Movies
                    SET BoxOffice = @BoxOffice${shouldUpdateReleaseDate ? ', DomesticReleaseDate = @DomesticReleaseDate' : ''}
                    WHERE TMDBId = @TMDBId
                `);
                context.log(`Updated movie ${movie.Title} (TMDB ID: ${movie.TMDBId}) with Box Office: ${movieData.revenue} and US Release Date: ${usReleaseDate}`);
            }
        } catch (err) {
            context.log(`Error updating movie ${movie.TMDBId}: ${err}`);
        }
        // Add a 300ms delay between requests to respect TMDB rate limits (40 per 10s)
        await new Promise(resolve => setTimeout(resolve, 300));
    }

}

app.timer('boxOfficeUpdate', {
    schedule: '0 0 8 * * *',
    handler: boxOfficeUpdate
});
