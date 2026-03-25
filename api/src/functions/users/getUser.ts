import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { User } from "../../models/DatabaseModels";

export async function getUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const pool = await poolPromise;
        
        const movieId = request.query.get('id');
        if (!movieId) {
            return { status: 400, body: "User ID is required" };
        }
        const result = await pool.request()
            .input('id', sql.Int, parseInt(movieId))
            .query<User>(`
                SELECT 
                    U.UserId,
                    U.Username,
                    U.JoinDate,
                    U.DisplayName
                FROM Users U
                WHERE UserId = @id`);

        if (result.recordset.length === 0) {
            return { status: 404, body: "User not found" };
        }
        
        const Users: User[] = result.recordset;

        return {
            status: 200,
            jsonBody: Users[0]
        };
    } catch (err) {
        context.error('Database query failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('getUser', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user',
    handler: getUser
});
