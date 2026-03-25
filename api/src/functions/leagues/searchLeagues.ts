import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";

/**
 * Search for Leagues by name with Team Count.
 */
export async function searchLeagues(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    // Extract query parameter '?q=searchterm'
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('q') || "";

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('Search', sql.VarChar, `%${searchQuery}%`)
            .query(`
                SELECT 
                    L.LeagueId, 
                    L.LeagueName, 
                    U.DisplayName AS AdminDisplayName,
                    L.StartDate, 
                    L.EndDate, 
                    L.StartingNumber, 
                    L.BenchNumber, 
                    L.FreeAgentsAllowed,
                    COUNT(T.TeamId) AS TeamCount
                FROM Leagues L
                INNER JOIN Users U ON L.AdminUserId = U.UserId
                LEFT JOIN Teams T ON L.LeagueId = T.LeagueId
                WHERE L.LeagueName LIKE @Search
                GROUP BY 
                    L.LeagueId, 
                    L.LeagueName, 
                    U.DisplayName,
                    L.StartDate, 
                    L.EndDate, 
                    L.StartingNumber, 
                    L.BenchNumber, 
                    L.FreeAgentsAllowed
                ORDER BY L.StartDate DESC
            `);

        // Return empty array instead of 404 for better UX on search pages
        return { 
            status: 200, 
            jsonBody: result.recordset 
        };

    } catch (error) {
        context.error("Search Leagues Error:", error);
        return { 
            status: 500, 
            body: "Internal Server Error occurred while searching the arena." 
        };
    }
}

app.http('searchLeagues', {
    methods: ['GET'],
    authLevel: 'anonymous', // Search is usually public, change to 'function' if needed
    route: 'leagues/search',
    handler: searchLeagues
});