import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import jwt from 'jsonwebtoken';


/**
 * Delete a team (owner only).
 */
export async function deleteTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Get teamId from query
    const teamId = request.query.get('id');
    if (!teamId) return { status: 400, body: "Team ID is required" };

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
            .input('TeamId', sql.Int, parseInt(teamId))
            .input('UserId', sql.Int, userId)
            .query(`
                DELETE FROM Teams
                WHERE TeamId = @TeamId AND OwnerUserId = @UserId
            `);

        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            return { status: 200, body: "Team deleted successfully" };
        } else {
            return { status: 403, body: "Forbidden: You are not the owner of this team or team not found" };
        }
    } catch (error) {
        context.log(`Error deleting team: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('deleteTeam', {
    methods: ['DELETE'],
    route: 'teams/delete',
    handler: deleteTeam
});