import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { Movie } from "../../models/DatabaseModels";
import { getMovieData } from "../../utils/helpers";



/**
 * Get Movie info using TMDB id.
 * If the movie is not in the database, query TMDB and add it to the database before returning the info.
 */
export async function getMovieInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const idParam = request.query.get('id');
    const isTmdb = request.query.get('tmdb') === 'true'; // Check if we are passing a TMDB ID

    if (!idParam) return { status: 400, body: "ID is required" };
    const id = parseInt(idParam);

    try {
        const pool = await poolPromise;
        let movie: any;

        if (isTmdb) {
            // Use your helper which handles the "Check DB -> Fetch TMDB -> Save" flow
            movie = await getMovieData(id);
        } else {
            // Standard lookup by your internal Primary Key
            const result = await pool.request()
                .input('MovieId', sql.Int, id)
                .query('SELECT * FROM Movies WHERE MovieId = @MovieId');
            
            movie = result.recordset[0];
        }

        if (!movie) return { status: 404, body: "Movie not found" };

        return { status: 200, jsonBody: movie };
    } catch (err) {
        context.error('Error fetching movie info:', err);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('getMovieInfo', {
    methods: ['GET'],
    route: 'movies/info',
    handler: getMovieInfo
}); 