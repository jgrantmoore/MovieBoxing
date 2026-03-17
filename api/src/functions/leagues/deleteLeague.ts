import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import jwt from 'jsonwebtoken';


/**
 * Delete a league (admin only).
 */
export async function deleteLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Get leagueId from query
    const leagueId = request.query.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    // Get and verify JWT token
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

    const pool = await poolPromise;

    try {
        const result = await pool.request()
            .input('LeagueId', sql.Int, parseInt(leagueId))
            .input('UserId', sql.Int, userId)
            .query(`
                DELETE FROM Leagues
                WHERE LeagueId = @LeagueId AND AdminUserId = @UserId
            `);

        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            return { status: 200, body: "League deleted successfully" };
        } else {
            return { status: 403, body: "Forbidden: You are not the admin of this league or league not found" };
        }
    } catch (error) {
        context.log(`Error deleting league: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('deleteLeague', {
    methods: ['DELETE'],
    route: 'leagues/delete',
    handler: deleteLeague
});