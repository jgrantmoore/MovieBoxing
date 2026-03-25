import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { poolPromise } from "../../db";

export async function login(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Destructure the 'username' field (which could contain an email or a username)
    const { username, password } = await request.json() as any;

    try {
        const pool = await poolPromise;

        // 1. Update the query to check both Email and Username columns
        const result = await pool.request()
            .input('identifier', sql.NVarChar, username)
            .query(`
                SELECT * FROM Users 
                WHERE Email = @identifier OR Username = @identifier
            `);

        const user = result.recordset[0];

        // 2. Validate user existence and password
        if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
            return {
                status: 401,
                jsonBody: { message: "Invalid credentials. Double-check your username/email." }
            };
        }

        // 3. Generate JWT (using the correct DB column for name)
        const token = jwt.sign(
            { userId: user.UserId, name: user.DisplayName },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        return {
            jsonBody: {
                token,
                userId: user.UserId.toString(),
                displayName: user.DisplayName,
                email: user.Email,
                username: user.Username // Good to return this for the session too
            }
        };
    } catch (err) {
        context.error('Login failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('login', {
    methods: ['POST'],
    route: 'login',
    handler: login
});