import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { CreateLeagueBody } from "../../models/DatabaseModels";
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

/**
 * Create a new league and automatically assign the creator a team.
 */
export async function createLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // 1. Verify Authorization Header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.warn("Unauthorized attempt: Missing or malformed Bearer token.");
        return { status: 401, body: "Unauthorized" };
    }
    
    const token = authHeader.substring(7);
    let adminUserId: number;

    try {
        // Verify the JWT matches your secret
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        adminUserId = payload.userId; 
    } catch (error) {
        context.error("JWT Verification failed:", error);
        return { status: 401, body: "Invalid or expired token" };
    }

    // 2. Parse and Validate Request Body
    const body = await request.json() as Partial<CreateLeagueBody>;
    
    if (!body.LeagueName || !body.StartDate || !body.EndDate || 
        body.StartingNumber === undefined || body.BenchNumber === undefined || 
        !body.PreferredReleaseDate || body.FreeAgentsAllowed === undefined) {
        return { status: 400, body: "Missing required fields for league creation." };
    }

    const pool = await poolPromise;
    // We use a Transaction to ensure we don't create a league without an owner team
    const transaction = new sql.Transaction(pool);

    try {
        if (body.JoinPassword) {
            const saltRounds = 12;
            body.JoinPassword = await bcrypt.hash(body.JoinPassword, saltRounds);
        } else {
            body.JoinPassword = null; // Ensure it's null if not provided
        }

        await transaction.begin();

        // 3. Insert the League
        const leagueResult = await transaction.request()
            .input('LeagueName', sql.NVarChar, body.LeagueName)
            .input('AdminUserId', sql.Int, adminUserId)
            .input('StartDate', sql.DateTime, new Date(body.StartDate))
            .input('EndDate', sql.DateTime, new Date(body.EndDate))
            .input('StartingNumber', sql.Int, body.StartingNumber)
            .input('BenchNumber', sql.Int, body.BenchNumber)
            .input('JoinPasswordHash', sql.NVarChar, body.JoinPassword)
            .input('PreferredReleaseDate', sql.NVarChar, body.PreferredReleaseDate)
            .input('FreeAgentsAllowed', sql.Bit, body.FreeAgentsAllowed)
            .query(`
                INSERT INTO Leagues (
                    LeagueName, AdminUserId, StartDate, EndDate, 
                    StartingNumber, BenchNumber, JoinPasswordHash, 
                    PreferredReleaseDate, FreeAgentsAllowed
                )
                OUTPUT INSERTED.LeagueId, INSERTED.LeagueName
                VALUES (
                    @LeagueName, @AdminUserId, @StartDate, @EndDate, 
                    @StartingNumber, @BenchNumber, @JoinPasswordHash, 
                    @PreferredReleaseDate, @FreeAgentsAllowed
                )
            `);

        const leagueId = leagueResult.recordset[0].LeagueId;

        // 4. Automatically Create the Admin's Team
        await transaction.request()
            .input('LeagueId', sql.Int, leagueId)
            .input('OwnerUserId', sql.Int, adminUserId)
            .input('TeamName', sql.NVarChar, `${body.LeagueName} Admin`) 
            .query(`
                INSERT INTO Teams (LeagueId, OwnerUserId, TeamName)
                VALUES (@LeagueId, @OwnerUserId, @TeamName)
            `);

        // Commit both inserts
        await transaction.commit();

        return { 
            status: 201, 
            jsonBody: { 
                success: true,
                league: leagueId 
            } 
        };

    } catch (error) {
        // If anything failed, undo the league creation
        if (transaction) await transaction.rollback();
        
        context.error(`Database Error in CreateLeague: ${error}`);
        return { status: 500, body: "Internal server error occurred while creating league." };
    }
}

// Function Registration
app.http('createLeague', {
    methods: ['POST'],
    route: 'leagues/create',
    handler: createLeague
});