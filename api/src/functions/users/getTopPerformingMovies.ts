import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { User } from "../../models/DatabaseModels";

export async function getTopPerformingMovies(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await poolPromise;

        const userId = request.query.get('id');
        if (!userId) {
            return { status: 400, body: "User ID is required" };
        }
        const result = await pool.request()
            .input('id', sql.Int, parseInt(userId))
            .query<User>(`
                SELECT TOP 5
                    m.Title,
                    m.BoxOffice,
                    m.InternationalReleaseDate,
                    m.PosterUrl,
                    m.MovieId,
                    p.OrderDrafted,
                    t.TeamName,
                    l.LeagueName
                FROM TeamMovies p
                JOIN Movies m ON p.MovieId = m.MovieId
                JOIN Teams t ON p.TeamId = t.TeamId
                JOIN Leagues l ON t.LeagueId = l.LeagueId
                JOIN Users u ON t.OwnerUserId = u.UserId
                WHERE u.UserId = @id
                -- Only pull from leagues that haven't ended yet
                AND l.EndDate >= GETDATE() 
                AND l.StartDate <= GETDATE()
                -- Optional: Only include "Starting" movies (slots 1-5)
                AND p.OrderDrafted <= 5 
                ORDER BY m.BoxOffice DESC;
            `);

        if (result.recordset.length === 0) {
            return { status: 404, body: "User not found" };
        }

        const Users: User[] = result.recordset;

        return {
            status: 200,
            jsonBody: Users
        };
    } catch (err) {
        context.error('Database query failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('getTopPerformingMovies', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user/top-performing-movies',
    handler: getTopPerformingMovies
});
