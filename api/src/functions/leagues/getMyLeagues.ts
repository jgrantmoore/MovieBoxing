import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import jwt from 'jsonwebtoken';


/**
 * Get League info using User ID from JWT Token.
 */
export async function getMyLeagues(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

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

    const result = await pool.request()
        .input('UserId', sql.Int, userId)
        .query(`
            SELECT DISTINCT
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
            LEFT JOIN Teams T ON L.LeagueId = T.LeagueId
            WHERE L.AdminUserId = @UserId OR T.OwnerUserId = @UserId
        `);

    if (result.recordset.length > 0) {
        return { status: 200, jsonBody: result.recordset };
    } else {
        return { status: 404, body: "No leagues found" };
    }

}

app.http('getMyLeagues', {
    methods: ['GET'],
    route: 'leagues/my',
    handler: getMyLeagues
});