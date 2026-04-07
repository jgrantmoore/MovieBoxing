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

                // 1. Force the type to string immediately using a fallback
                const usEntry = movieData.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
                const theatrical = usEntry?.release_dates.find((rd: any) => rd.type === 3);

                // This ensures usReleaseDate is NEVER undefined
                const usReleaseDate: string = theatrical?.release_date
                    || usEntry?.release_dates[0]?.release_date
                    || movieData.release_date
                    || new Date().toISOString();

                // 2. Normalize for comparison
                // We use a safe fallback for the DB date as well
                const dbDateRaw = movie.USReleaseDate || movie.usreleasedate || new Date(0).toISOString();
                const dbDate = new Date(dbDateRaw).toISOString().split('T')[0];
                const tmdbDate = new Date(usReleaseDate).toISOString().split('T')[0];

                const hasBoxOfficeChanged = Number(movieData.revenue) !== Number(movie.BoxOffice || movie.boxoffice);
                const hasReleaseDateChanged = tmdbDate !== dbDate;

                if (hasBoxOfficeChanged || hasReleaseDateChanged) {
                    const query = `
                UPDATE "Movies"
                SET "BoxOffice" = $1, "USReleaseDate" = $2
                WHERE "TMDBId" = $3
            `;

                    // Now usReleaseDate is guaranteed to be a string
                    await pool.query(query, [
                        movieData.revenue,
                        new Date(usReleaseDate),
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