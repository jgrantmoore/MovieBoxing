import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import { poolPromise } from "../../db";
import * as jwt from 'jsonwebtoken';

export async function updateUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // 1. Extract the token from the header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: "Unauthorized: No token provided." };
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Decode the token to get the user ID
        // Note: verify this against your secret/public key in production
        const decoded = jwt.decode(token) as { sub: string }; 
        const userId = decoded.sub;

        const { name, username, password } = await request.json() as any;

        const pool = await poolPromise;
        const req = pool.request();
        
        req.input('userId', sql.Int, userId); // Assuming userId is an Integer ID
        
        let updateFields: string[] = [];
        
        if (name) {
            req.input('name', sql.NVarChar, name);
            updateFields.push("DisplayName = @name");
        }
        if (username) {
            req.input('username', sql.NVarChar, username);
            updateFields.push("Username = @username");
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 12);
            req.input('password', sql.NVarChar, hashedPassword);
            updateFields.push("PasswordHash = @password");
        }

        if (updateFields.length === 0) {
            return { status: 400, body: "No update information provided." };
        }

        const query = `UPDATE Users SET ${updateFields.join(', ')} WHERE Id = @userId`;
        const result = await req.query(query);

        if (result.rowsAffected[0] === 0) {
            return { status: 404, body: "User not found." };
        }

        return { status: 200, body: "User updated successfully." };
    } catch (err) {
        context.error('Update failed:', err);
        return { status: 401, body: "Invalid token or server error." };
    }
}

app.http('updateUser', {
    methods: ['PUT'],
    route: 'user/update',
    handler: updateUser
});