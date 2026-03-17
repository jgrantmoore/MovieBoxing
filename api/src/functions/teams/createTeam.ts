import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { CreateTeamBody } from "../../models/DatabaseModels";
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';


/**
 * Create a new team.
 */
export async function createTeam(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: "Unauthorized" };
    }
    const token = authHeader.substring(7); // Remove 'Bearer '

    let ownerUserId: number;
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        ownerUserId = payload.userId; // Assuming 'userId' in JWT payload
    } catch (error) {
        return { status: 401, body: "Invalid token" };
    }

    const body = await request.json() as Partial<CreateTeamBody>;
    
    // Validate required fields
    if (!body.TeamName || body.LeagueId === undefined || body.LeaguePassword === undefined) {
        return { status: 400, body: "Missing required fields" };
    }

    const pool = await poolPromise;

    try {
        // Verify league password
        const leagueResult = await pool.request()
            .input('LeagueId', sql.Int, body.LeagueId)
            .query(`
                SELECT JoinPasswordHash 
                FROM Leagues 
                WHERE LeagueId = @LeagueId
            `);

        if (leagueResult.recordset.length === 0) {
            return { status: 404, body: "League not found" };
        }

        if (!(await bcrypt.compare(body.LeaguePassword, leagueResult.recordset[0].JoinPasswordHash))) {
            return { status: 401, body: "Invalid league password." };
        }

        const joinPasswordHash = leagueResult.recordset[0].JoinPasswordHash;
        if (joinPasswordHash !== body.LeaguePassword) {
            return { status: 403, body: "Incorrect league password" };
        }
    } catch (error) {
        context.log(`Error verifying league password: ${error}`);
        return { status: 500, body: "Internal server error" };
    }

    try {
        const result = await pool.request()
            .input('LeagueId', sql.Int, body.LeagueId)
            .input('OwnerUserId', sql.Int, ownerUserId)
            .input('TeamName', sql.NVarChar, body.TeamName)

            .query(`
                INSERT INTO Teams (LeagueId, OwnerUserId, TeamName)
                OUTPUT INSERTED.*
                VALUES (@LeagueId, @OwnerUserId, @TeamName)
            `);

        if (result.recordset.length > 0) {
            return { status: 201, jsonBody: result.recordset[0] };
        } else {
            return { status: 500, body: "Failed to create team" };
        }
    } catch (error) {
        context.log(`Error creating team: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('createTeam', {
    methods: ['POST'],
    route: 'teams/create',
    handler: createTeam
});