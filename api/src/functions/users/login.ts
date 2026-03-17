import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as sql from 'mssql';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { poolPromise } from "../../db";

export async function login(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const { email, password } = await request.json() as any;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];
        if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
            return { status: 401, body: "Invalid email or password." };
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.UserId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        
        return { jsonBody: { token } };
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