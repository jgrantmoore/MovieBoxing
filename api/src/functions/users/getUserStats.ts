import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { User } from "../../models/DatabaseModels";

export async function getUserStats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await poolPromise;
        
        const movieId = request.query.get('id');
        if (!movieId) {
            return { status: 400, body: "User ID is required" };
        }
        const result = await pool.request()
            .input('id', sql.Int, parseInt(movieId))
            .query<User>(`
                SELECT 
                    U.UserId,
                    U.Username,
                    U.JoinDate,
                    U.DisplayName,
                    -- Count distinct leagues the user has a team in
                    (SELECT COUNT(*) FROM Teams WHERE OwnerUserId = U.UserId) AS LeagueCount,
                    
                    -- Count total movies across all teams
                    (SELECT COUNT(*) FROM TeamMovies tm 
                    JOIN Teams t ON tm.TeamId = t.TeamId 
                    WHERE t.OwnerUserId = U.UserId) AS MovieCount,
                    
                    -- Count leagues where this user is the winner
                    (SELECT COUNT(*) FROM Leagues WHERE LeagueWinnerId = U.UserId) AS LeaguesWon,
                    
                    -- Sum box office from all movies owned by this user's teams
                    ISNULL((
                        SELECT SUM(m.BoxOffice) 
                        FROM Movies m
                        JOIN TeamMovies tm ON m.MovieId = tm.MovieId
                        JOIN Teams t ON tm.TeamId = t.TeamId
                        WHERE t.OwnerUserId = U.UserId
                    ), 0) AS TotalEarnings
                FROM Users U
                WHERE U.UserId = @id
                GROUP BY U.UserId, U.Username, U.JoinDate, U.DisplayName
            `);

        if (result.recordset.length === 0) {
            return { status: 404, body: "User not found" };
        }
        
        const Users: User[] = result.recordset;

        return {
            status: 200,
            jsonBody: Users[0]
        };
    } catch (err) {
        context.error('Database query failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('getUserStats', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user/stats',
    handler: getUserStats
});
