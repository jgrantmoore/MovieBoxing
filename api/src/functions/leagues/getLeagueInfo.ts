import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { League } from "../../models/DatabaseModels";


/**
 * Get League info using League ID.
 */
export async function getLeagueInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const leagueId = request.query.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    const pool = await poolPromise;

    const result = await pool.request()
        .input('LeagueId', sql.Int, parseInt(leagueId))
        .query(`
            SELECT 
                L.LeagueId, 
                L.LeagueName, 
                U.DisplayName AS AdminDisplayName, 
                L.StartDate, 
                L.EndDate, 
                L.StartingNumber, 
                L.BenchNumber, 
                L.PreferredReleaseDate, 
                L.FreeAgentsAllowed
            FROM Leagues L
            INNER JOIN Users U ON L.AdminUserId = U.UserId
            WHERE L.LeagueId = @LeagueId
        `);

    if (result.recordset.length > 0) {
        return { status: 200, jsonBody: result.recordset[0] };
    } else {
        return { status: 404, body: "League not found" };
    }

}

app.http('getLeagueInfo', {
    methods: ['GET'],
    route: 'leagues/info',
    handler: getLeagueInfo
});