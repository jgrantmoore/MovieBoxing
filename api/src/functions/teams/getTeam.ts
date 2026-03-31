import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import * as jwt from 'jsonwebtoken';

/**
 * Fetch all teams for the logged-in user, including their movie picks 
 * with poster images and box office totals.
 */
export async function getUserTeamsAndPicks(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // 1. JWT Verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: "Unauthorized" };
    }

    const token = authHeader.substring(7);
    let userId: number;

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = payload.userId;
    } catch (error) {
        return { status: 401, body: "Invalid token" };
    }

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('teamId', sql.Int, userId)
            .query(`
            SELECT 
                t.TeamId, 
                t.TeamName, 
                t.LeagueId,
                l.LeagueName,
                tm.MovieId,
                tm.OrderDrafted,
                tm.IsStarting,
                m.Title,
                m.PosterUrl,
                m.BoxOffice,
                m.USReleaseDate
            FROM Teams t
            LEFT JOIN Leagues l ON t.LeagueId = l.LeagueId
            LEFT JOIN TeamMovies tm ON t.TeamId = tm.TeamId
            LEFT JOIN Movies m ON tm.MovieId = m.MovieId
            WHERE t.TeamId = @teamId
            ORDER BY tm.OrderDrafted ASC
        `);

        const teamsMap = new Map();

        result.recordset.forEach(row => {
            if (!teamsMap.has(row.TeamId)) {
                teamsMap.set(row.TeamId, {
                    TeamId: row.TeamId,
                    TeamName: row.TeamName,
                    LeagueId: row.LeagueId,
                    LeagueName: row.LeagueName, // Added this to the object
                    Picks: []
                });
            }

            if (row.MovieId) {
                teamsMap.get(row.TeamId).Picks.push({
                    MovieId: row.MovieId,
                    Title: row.Title,
                    PosterUrl: row.PosterUrl,
                    BoxOffice: row.BoxOffice,
                    OrderDrafted: row.OrderDrafted,
                    ReleaseDate: row.USReleaseDate
                });
            }
        });

        const finalTeams = Array.from(teamsMap.values());

        return {
            status: 200,
            jsonBody: finalTeams
        };
    } catch (error) {
        context.error(`Error fetching user teams: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('getUserTeamsAndPicks', {
    methods: ['GET'],
    route: 'teams',
    handler: getUserTeamsAndPicks
});