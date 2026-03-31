import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";

/**
 * Get all movies in a league ordered by International Release Date.
 */
export async function getLeagueReleaseOrder(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const leagueId = request.query.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('LeagueId', sql.Int, parseInt(leagueId))
            .query(`
                SELECT DISTINCT
                    m.MovieId,
                    m.Title,
                    m.BoxOffice,
                    m.PosterUrl,
                    m.InternationalReleaseDate,
                    t.TeamName,
                    u.DisplayName as OwnerName
                FROM Leagues l
                JOIN Teams t ON l.LeagueId = t.LeagueId
                JOIN Users u ON t.OwnerUserId = u.UserId
                JOIN TeamMovies tm ON t.TeamId = tm.TeamId
                JOIN Movies m ON tm.MovieId = m.MovieId
                WHERE l.LeagueId = @LeagueId
                ORDER BY m.InternationalReleaseDate ASC;
            `);

        // We use map to format the release dates properly for your frontend
        const movies = result.recordset.map(row => ({
            MovieId: row.MovieId,
            Title: row.Title,
            BoxOffice: row.BoxOffice,
            PosterUrl: row.PosterUrl,
            ReleaseDate: row.InternationalReleaseDate,
            OwnedBy: {
                TeamName: row.TeamName,
                Owner: row.OwnerName
            }
        }));

        return { 
            status: 200, 
            jsonBody: movies 
        };

    } catch (error) {
        context.error("Get League Movies Error:", error);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('getLeagueReleaseOrder', {
    methods: ['GET'],
    route: 'leagues/release-order',
    handler: getLeagueReleaseOrder
});