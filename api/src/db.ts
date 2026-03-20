import * as sql from 'mssql';

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: 'web-boxing-server.database.windows.net',
    database: 'web-boxing-db',
    options: { encrypt: true }
};

const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
    console.log('Connected to SQL Server');
    return pool;
}).catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
});

export { poolPromise, sql };