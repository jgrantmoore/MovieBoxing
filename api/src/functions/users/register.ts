import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import { poolPromise } from "../../db";

export async function register(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const { name, username, email, password } = await request.json() as any;

    if (!email || !password || !name || !username) {
        return { status: 400, body: "Must enter all fields to create account." };
    }

    let parsedUsername = username.trim().toLowerCase();
    if (parsedUsername.length < 3 || parsedUsername.length > 50) {
        return { status: 400, body: "Username must be between 3 and 50 characters." };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(parsedUsername)) {
        return { status: 400, body: "Username can only contain letters, numbers, and underscores." };
    }

    let parsedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedEmail)) {
        return { status: 400, body: "Invalid email format." };
    }


    try {
        const pool = await poolPromise;
        const existingUser = await pool.request()
            .input('email', sql.NVarChar, parsedEmail)
            .input('username', sql.NVarChar, parsedUsername)
            .query('SELECT UserId FROM Users WHERE Email = @email OR Username = @username');

        if (existingUser.recordset.length > 0) {
            return { status: 409, body: "Email or username already in use." };
        }

    } catch (err) {
        context.error('Registration failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }

    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const pool = await poolPromise;

        await pool.request()
            .input('email', sql.NVarChar, parsedEmail)
            .input('password', sql.NVarChar, hashedPassword)
            .input('name', sql.NVarChar, name)
            .input('username', sql.NVarChar, parsedUsername)
            .query('INSERT INTO Users (Email, PasswordHash, DisplayName, JoinDate, Username) VALUES (@email, @password, @name, GETDATE(), @username)');

        return { status: 201, body: "User registered successfully." };
    } catch (err) {
        context.error('Registration failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('register', { 
    methods: ['POST', 'OPTIONS'], 
    route: 'register', 
    handler: register 
});