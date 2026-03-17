import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { League } from "../../models/DatabaseModels";
import jwt from 'jsonwebtoken';


/**
 * Update an existing league (admin only).
 */
export async function updateLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

    const body = await request.json() as Partial<Omit<League, 'LeagueId'>>;

    // Check if at least one field is provided
    if (Object.keys(body).length === 0) {
        return { status: 400, body: "No fields to update" };
    }

    const pool = await poolPromise;

    try {
        // Build dynamic SET clause
        const setParts: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        if (body.LeagueName !== undefined) {
            setParts.push('LeagueName = @LeagueName');
            inputs.push({ name: 'LeagueName', type: sql.NVarChar, value: body.LeagueName });
        }
        if (body.StartDate !== undefined) {
            setParts.push('StartDate = @StartDate');
            inputs.push({ name: 'StartDate', type: sql.DateTime, value: new Date(body.StartDate) });
        }
        if (body.EndDate !== undefined) {
            setParts.push('EndDate = @EndDate');
            inputs.push({ name: 'EndDate', type: sql.DateTime, value: new Date(body.EndDate) });
        }
        if (body.StartingNumber !== undefined) {
            setParts.push('StartingNumber = @StartingNumber');
            inputs.push({ name: 'StartingNumber', type: sql.Int, value: body.StartingNumber });
        }
        if (body.BenchNumber !== undefined) {
            setParts.push('BenchNumber = @BenchNumber');
            inputs.push({ name: 'BenchNumber', type: sql.Int, value: body.BenchNumber });
        }
        if (body.JoinPasswordHash !== undefined) {
            setParts.push('JoinPasswordHash = @JoinPasswordHash');
            inputs.push({ name: 'JoinPasswordHash', type: sql.NVarChar, value: body.JoinPasswordHash });
        }
        if (body.PreferredReleaseDate !== undefined) {
            setParts.push('PreferredReleaseDate = @PreferredReleaseDate');
            inputs.push({ name: 'PreferredReleaseDate', type: sql.NVarChar, value: body.PreferredReleaseDate });
        }
        if (body.FreeAgentsAllowed !== undefined) {
            setParts.push('FreeAgentsAllowed = @FreeAgentsAllowed');
            inputs.push({ name: 'FreeAgentsAllowed', type: sql.Bit, value: body.FreeAgentsAllowed });
        }

        if (setParts.length === 0) {
            return { status: 400, body: "No valid fields to update" };
        }

        const setClause = setParts.join(', ');
        const query = `
            UPDATE Leagues
            SET ${setClause}
            OUTPUT INSERTED.*
            WHERE LeagueId = @LeagueId AND AdminUserId = @UserId
        `;

        const request = pool.request()
            .input('LeagueId', sql.Int, parseInt(leagueId))
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

app.http('updateLeague', {
    methods: ['PUT'],
    route: 'leagues/update',
    handler: updateLeague
});