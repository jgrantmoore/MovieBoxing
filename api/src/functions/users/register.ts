import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import { poolPromise } from "../../db";

export async function register(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const { name, username, email, password } = await request.json() as any;

    if (!email || !password) {
        return { status: 400, body: "Email and password are required." };
    }

    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const pool = await poolPromise;

        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('name', sql.NVarChar, name)
            .input('username', sql.NVarChar, username)
            .query('INSERT INTO Users (Email, PasswordHash, DisplayName, JoinDate, Username) VALUES (@email, @password, @name, GETDATE(), @username)');

        return { status: 201, body: "User registered successfully." };
    } catch (err) {
        context.error('Registration failed:', err);
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('register', { 
    methods: ['POST'], 
    route: 'register', 
    handler: register 
});