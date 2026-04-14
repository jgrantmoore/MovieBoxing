import { pool } from '../config/db.js';

export async function syncMovieData() {
    console.log('Cron Job: Starting Daily Movie Sync...');

    try {
        const { rows: movies } = await pool.query('SELECT * FROM "Movies"');

        for (const movie of movies) {
            try {
                const options = {
                    method: 'GET',
                    headers: {
                        accept: 'application/json',
                        Authorization: `Bearer ${process.env.TMDB_API_KEY}`
                    }
                };

                const response = await fetch(
                    `https://api.themoviedb.org/3/movie/${movie.TMDBId || movie.tmdbid}?append_to_response=release_dates`,
                    options
                );
                const movieData: any = await response.json();

                // TMDB nests the append_to_response inside the movie object
                const releaseResults = movieData.release_dates?.results || [];

                // --- 1. INTERNATIONAL RELEASE CALCULATION ---
                // Filter for Premiere (2) or Theatrical (3) globally
                const internationalDates = releaseResults.flatMap((country: any) =>
                    country.release_dates
                        .filter((rd: any) => rd.type === 2 || rd.type === 3)
                        .map((rd: any) => rd.release_date)
                );

                const internationalReleaseDateStr: string = internationalDates.length > 0
                    ? internationalDates.sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0]
                    : movieData.release_date || new Date().toISOString();

                // --- 2. US RELEASE CALCULATION ---
                const usEntry = releaseResults.find((r: any) => r.iso_3166_1 === 'US');
                const usReleaseDateStr: string = 
                    usEntry?.release_dates.find((rd: any) => rd.type === 3)?.release_date 
                    || usEntry?.release_dates[0]?.release_date 
                    || internationalReleaseDateStr;

                // --- 3. CHANGE DETECTION ---
                const dbUSDateRaw = movie.USReleaseDate || new Date(0).toISOString();
                const dbINTLDateRaw = movie.InternationalReleaseDate || new Date(0).toISOString();
                const dbUSDate = new Date(dbUSDateRaw).toISOString().split('T')[0];
                const dbINTLDate = new Date(dbINTLDateRaw).toISOString().split('T')[0];
                const tmdbUSDate = new Date(usReleaseDateStr).toISOString().split('T')[0];
                const tmdbINTLDate = new Date(internationalReleaseDateStr).toISOString().split('T')[0];

                const hasBoxOfficeChanged = Number(movieData.revenue) !== Number(movie.BoxOffice || movie.boxoffice);
                const hasUSReleaseDateChanged = tmdbUSDate !== dbUSDate;
                const hasINTLReleaseDateChanged = tmdbINTLDate !== dbINTLDate;

                if (hasBoxOfficeChanged || hasUSReleaseDateChanged || hasINTLReleaseDateChanged) {
                    // Fixed the trailing comma/duplicate column in the SQL query
                    const query = `
                        UPDATE "Movies"
                        SET "BoxOffice" = $1, 
                            "USReleaseDate" = $2,
                            "InternationalReleaseDate" = $3,
                            "PosterUrl" = $4
                        WHERE "TMDBId" = $5
                    `;

                    const newRevenue = (movieData.revenue == null) ? 0 : movieData.revenue;

                    await pool.query(query, [
                        newRevenue,
                        new Date(usReleaseDateStr), // DB driver handles Date objects
                        new Date(internationalReleaseDateStr),
                        movieData.poster_path,
                        movie.TMDBId || movie.tmdbid
                    ]);
                    
                    console.log(`Cron Updated: ${movie.Title || movie.title}`);
                }
            } catch (err) {
                console.error(`Cron Error updating TMDB ID ${movie.TMDBId}:`, err);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        console.log('Cron Job: Sync Finished.');
    } catch (err) {
        console.error('Critical Cron Failure:', err);
    }
}