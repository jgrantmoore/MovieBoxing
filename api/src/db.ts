import * as sql from 'mssql';

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: 'web-boxing-server.database.windows.net',
    database: 'web-boxing-db',
    options: { encrypt: true }
};

const poolPromise = new sql.ConnectionPool(config).connect();

export { poolPromise, sql };