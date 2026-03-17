import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { Movie } from "../../models/DatabaseModels";

export async function getMovies(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request().query<Movie>('SELECT * FROM Movies');
        
        const movies: Movie[] = result.recordset;

        return {
            status: 200,
            jsonBody: movies
        };
    } catch (err) {
        context.error('Database query failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('getMovies', {
    methods: ['GET'],
    route: 'movies',
    handler: getMovies
});