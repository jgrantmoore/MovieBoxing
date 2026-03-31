import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import jwt from 'jsonwebtoken';

/**
 * Search for Leagues by name with Team Count.
 */
export async function searchLeagues(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    // Extract query parameter '?q=searchterm'
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q') || "";

    // Get and verify JWT token
    let userId: number;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
            userId = payload.userId;
        } catch (error) {
            userId = -1; // Invalid token, treat as unauthenticated
        }
    } else {
        userId = -1; // No token provided, treat as unauthenticated
    }

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('Search', sql.VarChar, `%${searchQuery}%`)
            .input('CurrentUserId', sql.Int, userId) // Pass this in for the JOIN
            .query(`
                SELECT 
                    L.LeagueId, 
                    L.LeagueName, 
                    L.AdminUserId,
                    U.DisplayName AS AdminDisplayName,
                    L.StartDate, 
                    L.EndDate, 
                    L.StartingNumber, 
                    L.BenchNumber, 
                    L.FreeAgentsAllowed,
                    L.HasDrafted,
                    L.IsDrafting,
                    L.JoinPasswordHash,
                    COUNT(T.TeamId) AS TeamCount,
                    -- Check if the current user has a team in this league
                    MAX(CASE WHEN T.OwnerUserId = @CurrentUserId THEN 1 ELSE 0 END) AS IsJoined
                FROM Leagues L
                INNER JOIN Users U ON L.AdminUserId = U.UserId
                LEFT JOIN Teams T ON L.LeagueId = T.LeagueId
                WHERE L.LeagueName LIKE @Search
                GROUP BY 
                    L.LeagueId, L.LeagueName, L.AdminUserId, U.DisplayName,
                    L.StartDate, L.EndDate, L.StartingNumber, L.BenchNumber, 
                    L.FreeAgentsAllowed, L.HasDrafted, L.IsDrafting, L.JoinPasswordHash
                ORDER BY L.StartDate DESC
            `);

        const leagues = result.recordset.map(row => {
            return {
                LeagueId: row.LeagueId,
                LeagueName: row.LeagueName,
                StartDate: row.StartDate,
                EndDate: row.EndDate,
                HasDrafted: row.HasDrafted,
                IsDrafting: row.IsDrafting,
                isPrivate: !!row.JoinPasswordHash, // Cleaner boolean check
                AdminName: row.AdminDisplayName,
                TeamCount: row.TeamCount,
                Rules: {
                    Starting: row.StartingNumber,
                    Bench: row.BenchNumber,
                    FreeAgents: row.FreeAgentsAllowed
                },
                // Add auth-specific fields
                ...(userId > 0 && {
                    isJoined: row.IsJoined === 1,
                    isAdmin: row.AdminUserId === userId
                })
            };
        });

        return {
            status: 200,
            jsonBody: leagues // Return the mapped array
        };

    } catch (error) {
        context.error("Search Leagues Error:", error);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('searchLeagues', {
    methods: ['GET'],
    authLevel: 'anonymous', // Search is usually public, change to 'function' if needed
    route: 'leagues/search',
    handler: searchLeagues
});