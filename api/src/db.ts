import * as sql from 'mssql';

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: 'web-boxing-server.database.windows.net',
    database: 'web-boxing-db',
    options: { encrypt: true },
    connectionTimeout: 15000 // 15 seconds
};

async function connectWithRetry(retries = 4, delay = 2000): Promise<sql.ConnectionPool> {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const pool = await new sql.ConnectionPool(config).connect();
            console.log('Connected to SQL Server');
            return pool;
        } catch (err) {
            lastError = err;
            console.error(`Database connection attempt ${attempt} failed:`, err);
            if (attempt < retries) {
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    console.error('Database Connection Failed after retries! Bad Config: ', lastError);
    throw lastError;
}

const poolPromise = connectWithRetry();

export { poolPromise, sql };