import { poolPromise, sql } from "../../db";
import { Movie } from "../../models/DatabaseModels";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";


export async function localBoxOfficeUpdate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

            // --- International Release Date: earliest type 2 or 3 (Theatrical or Premiere) across all countries (including US) ---
            let internationalReleaseDate: string | undefined;
            const allType2or3Dates: string[] = [];
            const allEntries = movieData.release_dates?.results || [];
            for (const entry of allEntries) {
                for (const rd of entry.release_dates) {
                    if ((rd.type === 2 || rd.type === 3) && rd.release_date) {
                        allType2or3Dates.push(rd.release_date);
                    }
                }
            }
            if (allType2or3Dates.length > 0) {
                // Sort and take the earliest
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
            internationalReleaseDate = internationalReleaseDate || movieData.release_date || new Date().toISOString();

            // Only update if the box office, US release date, or International release date has changed
            let boxOffice = 0;
            if (movieData.revenue != null) {
                boxOffice = movieData.revenue;
            } 
            const shouldUpdateBoxOffice = boxOffice !== movie.BoxOffice;
            const shouldUpdateReleaseDate = usReleaseDate && usReleaseDate !== movie.DomesticReleaseDate;
            const shouldUpdateIntlReleaseDate = internationalReleaseDate && internationalReleaseDate !== movie.InternationalReleaseDate;

            if (shouldUpdateBoxOffice || shouldUpdateReleaseDate || shouldUpdateIntlReleaseDate) {
                const req = pool.request()
                    .input('TMDBId', sql.Int, movie.TMDBId)
                    .input('BoxOffice', sql.Decimal, boxOffice);
                if (shouldUpdateReleaseDate) {
                    req.input('DomesticReleaseDate', sql.Date, usReleaseDate);
                }
                if (shouldUpdateIntlReleaseDate) {
                    req.input('InternationalReleaseDate', sql.Date, internationalReleaseDate);
                }
                await req.query(`
                    UPDATE Movies
                    SET BoxOffice = @BoxOffice${shouldUpdateReleaseDate ? ', USReleaseDate = @DomesticReleaseDate' : ''}${shouldUpdateIntlReleaseDate ? ', InternationalReleaseDate = @InternationalReleaseDate' : ''}
                    WHERE TMDBId = @TMDBId
                `);
                context.log(`Updated movie ${movie.Title} (TMDB ID: ${movie.TMDBId}) with Box Office: ${movieData.revenue}, US Release Date: ${usReleaseDate}, International Release Date: ${internationalReleaseDate}`);
            }
        } catch (err) {
            context.log(`Error updating movie ${movie.TMDBId}: ${err}`);
            return { status: 500, body: "Internal Server Error" + err };
        }
        // Add a 300ms delay between requests to respect TMDB rate limits (40 per 10s)
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    return { status: 200, body: "Update completed successfully" };

}

app.http('localBoxOfficeUpdate', {
    methods: ['GET'],
    route: 'movies/local-box-office-update',
    handler: localBoxOfficeUpdate
});