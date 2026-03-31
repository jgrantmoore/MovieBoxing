import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";

export async function getLeaderboard(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const leagueId = request.query.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('LeagueId', sql.Int, parseInt(leagueId))
            .query(`
                WITH TeamTotals AS (
                    SELECT 
                        t.TeamId,
                        t.TeamName,
                        u.DisplayName as OwnerName,
                        SUM(ISNULL(m.BoxOffice, 0)) as TotalRevenue,
                        -- Count only STARTERS that have been released
                        COUNT(CASE WHEN m.InternationalReleaseDate <= GETDATE() AND tm.isStarting = 1 THEN 1 END) as ReleasedCount
                    FROM Teams t
                    JOIN Users u ON t.OwnerUserId = u.UserId
                    LEFT JOIN TeamMovies tm ON t.TeamId = tm.TeamId AND tm.isStarting = 1 -- Join only starters
                    LEFT JOIN Movies m ON tm.MovieId = m.MovieId
                    WHERE t.LeagueId = @LeagueId
                    GROUP BY t.TeamId, t.TeamName, u.DisplayName
                ),
                MVPPicks AS (
                    SELECT 
                        tm.TeamId,
                        m.Title as TopMovie,
                        ROW_NUMBER() OVER (PARTITION BY tm.TeamId ORDER BY m.BoxOffice DESC) as Rank
                    FROM TeamMovies tm
                    JOIN Movies m ON tm.MovieId = m.MovieId
                    WHERE tm.isStarting = 1 -- Only starters can be MVP
                )
                SELECT 
                    tt.*,
                    ISNULL(mp.TopMovie, 'None') as TopMovie
                FROM TeamTotals tt
                LEFT JOIN MVPPicks mp ON tt.TeamId = mp.TeamId AND mp.Rank = 1
                ORDER BY tt.TotalRevenue DESC, tt.ReleasedCount DESC;
            `);

        return { status: 200, jsonBody: result.recordset };
    } catch (error) {
        context.error("Leaderboard Fetch Error:", error);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('getLeaderboard', {
    methods: ['GET'],
    route: 'leagues/leaderboard',
    handler: getLeaderboard
});