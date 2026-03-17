import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { Team } from "../../models/DatabaseModels";
import jwt from 'jsonwebtoken';


/**
 * Update an existing team (owner only).
 */
export async function updateTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as Partial<Omit<Team, 'TeamId, OwnerUserId, LeagueId'>>;

    // Check if at least one field is provided
    if (Object.keys(body).length === 0) {
        return { status: 400, body: "No fields to update" };
    }

    const pool = await poolPromise;

    try {
        // Build dynamic SET clause
        const setParts: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        if (body.TeamName !== undefined) {
            setParts.push('TeamName = @TeamName');
            inputs.push({ name: 'TeamName', type: sql.NVarChar, value: body.TeamName });
        }

        if (setParts.length === 0) {
            return { status: 400, body: "No valid fields to update" };
        }

        const setClause = setParts.join(', ');
        const query = `
            UPDATE Teams
            SET ${setClause}
            OUTPUT INSERTED.*
            WHERE TeamId = @TeamId AND OwnerUserId = @UserId
        `;

        const request = pool.request()
            .input('TeamId', sql.Int, parseInt(teamId))
            .input('UserId', sql.Int, userId);

        inputs.forEach(input => {
            request.input(input.name, input.type, input.value);
        });

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            return { status: 200, jsonBody: result.recordset[0] };
        } else {
            return { status: 403, body: "Forbidden: You are not the admin of this league or league not found" };
        }
    } catch (error) {
        context.log(`Error updating league: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('updateTeam', {
    methods: ['PUT'],
    route: 'teams/update',
    handler: updateTeam
});