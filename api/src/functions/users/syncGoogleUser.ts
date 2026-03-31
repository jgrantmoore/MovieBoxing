import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import { poolPromise } from "../../db";
import * as jwt from 'jsonwebtoken';

export async function syncGoogleUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { email, name } = await request.json() as any;

        if (!email) {
            return { status: 400, body: "Email is required from Google provider." };
        }

        const pool = await poolPromise;

        // 1. Check if the user already exists
        const userCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT UserId, DisplayName FROM Users WHERE Email = @email');

        if (userCheck.recordset.length > 0) {
            // User exists - Return the existing UserId
            const existingUser = userCheck.recordset[0];
            const token = jwt.sign(
                { userId: existingUser.UserId, email: email },
                process.env.JWT_SECRET!,
                { expiresIn: '1h' }
            );

            return {
                status: 200,
                jsonBody: {
                    token, // MUST include this
                    userId: existingUser.UserId,
                    username: existingUser.Username || email.split('@')[0],
                    displayName: existingUser.DisplayName,
                    isNewUser: false
                }
            };
        }

        // 2. User doesn't exist - Create them
        // We use the email prefix as a placeholder username if your schema requires one
        const placeholderUsername = email.split('@')[0] + '_google';

        const insertResult = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('name', sql.NVarChar, name || 'Google User')
            .input('username', sql.NVarChar, placeholderUsername)
            .query(`
                INSERT INTO Users (Email, DisplayName, Username, JoinDate, PasswordHash) 
                OUTPUT INSERTED.UserId
                VALUES (@email, @name, @username, GETDATE(), NULL)
            `);

        const newUserId = insertResult.recordset[0].UserId;
        const newToken = jwt.sign(
            { userId: newUserId, email: email },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        return {
            status: 201,
            jsonBody: {
                token: newToken,
                userId: newUserId,
                username: placeholderUsername,
                displayName: name,
                isNewUser: true
            }
        };

    } catch (err) {
        context.error('Google Sync failed:', err);
        return { status: 500, body: "Internal Server Error during Google Sync" };
    }
}

app.http('syncGoogleUser', {
    methods: ['POST', 'OPTIONS'],
    route: 'users/sync-google',
    handler: syncGoogleUser
});