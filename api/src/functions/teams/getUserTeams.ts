//Probably want this to return a JSON array of all teams the user is on 
//with all movie picks and basic league info
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { Team } from "../../models/DatabaseModels";


/// Get all teams for a user.
export async function getUserTeams(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await poolPromise;
        
        const userId = request.query.get('userId');
        if (!userId) {
            return { status: 400, body: "User ID is required" };
        }
        const result = await pool.request()
            .input('userId', sql.Int, parseInt(userId))
            .query<Team>(`
                SELECT 
                    t.TeamId, 
                    t.TeamName, 
                    t.LeagueId,
                    l.LeagueName,
                FROM Teams 
                LEFT JOIN Leagues l ON t.LeagueId = l.LeagueId
                WHERE OwnerUserId = @userId`);

        if (result.recordset.length === 0) {
            return { status: 404, body: "No Teams found for this user" };
        }
        
        const Teams: Team[] = result.recordset;

        return {
            status: 200,
            jsonBody: Teams
        };
    } catch (err) {
        context.error('Error fetching user:', err);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('getUserTeams', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'getUserTeams',
    handler: getUserTeams
});