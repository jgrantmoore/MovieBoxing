import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { CreateLeagueBody } from "../../models/DatabaseModels";
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';


/**
 * Create a new league.
 */
export async function createLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: "Unauthorized" };
    }
    const token = authHeader.substring(7); // Remove 'Bearer '

    let adminUserId: number;
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        adminUserId = payload.userId; // Assuming 'userId' in JWT payload
    } catch (error) {
        return { status: 401, body: "Invalid token" };
    }

    const body = await request.json() as Partial<CreateLeagueBody>;
    
    // Validate required fields (excluding AdminUserId and LeagueId)
    if (!body.LeagueName || !body.StartDate || !body.EndDate || 
        body.StartingNumber === undefined || body.BenchNumber === undefined || 
        !body.JoinPassword || !body.PreferredReleaseDate || body.FreeAgentsAllowed === undefined) {
        return { status: 400, body: "Missing required fields" };
    }

    const pool = await poolPromise;

    try {

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(body.JoinPassword, saltRounds);
        const pool = await poolPromise;

        const result = await pool.request()
            .input('LeagueName', sql.NVarChar, body.LeagueName)
            .input('AdminUserId', sql.Int, adminUserId)
            .input('StartDate', sql.DateTime, new Date(body.StartDate))
            .input('EndDate', sql.DateTime, new Date(body.EndDate))
            .input('StartingNumber', sql.Int, body.StartingNumber)
            .input('BenchNumber', sql.Int, body.BenchNumber)
            .input('JoinPasswordHash', sql.NVarChar, hashedPassword)
            .input('PreferredReleaseDate', sql.NVarChar, body.PreferredReleaseDate)
            .input('FreeAgentsAllowed', sql.Bit, body.FreeAgentsAllowed)
            .query(`
                INSERT INTO Leagues (LeagueName, AdminUserId, StartDate, EndDate, StartingNumber, BenchNumber, JoinPasswordHash, PreferredReleaseDate, FreeAgentsAllowed)
                OUTPUT INSERTED.*
                VALUES (@LeagueName, @AdminUserId, @StartDate, @EndDate, @StartingNumber, @BenchNumber, @JoinPasswordHash, @PreferredReleaseDate, @FreeAgentsAllowed)
            `);

        if (result.recordset.length > 0) {
            return { status: 201, jsonBody: result.recordset[0] };
        } else {
            return { status: 500, body: "Failed to create league" };
        }
    } catch (error) {
        context.log(`Error creating league: ${error}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('createLeague', {
    methods: ['POST'],
    route: 'leagues/create',
    handler: createLeague
});