import { pool } from '../config/db.js';

export async function snapshotEndingLeagues() {
    console.log('Cron Job: Checking for leagues that ended yesterday...');
    
    // 1. Calculate "Yesterday" relative to the execution time
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yesterday = date.toISOString().split('T')[0];

    try {
        // 2. Find all leagues that ended yesterday
        const { rows: leagues } = await pool.query(
            'SELECT "LeagueId", "LeagueName" FROM "Leagues" WHERE "EndDate"::date = $1',
            [yesterday]
        );

        if (leagues.length === 0) {
            console.log(`Cron Job: No leagues ended on ${yesterday}.`);
            return;
        }

        for (const league of leagues) {
            console.log(`Freezing final scores for ${league.LeagueName} (Ended: ${yesterday})`);

            try {
                // 3. Capture movies and their current (final) box office
                const { rows: moviesToFreeze } = await pool.query(`
                    SELECT DISTINCT m."MovieId", m."BoxOffice"
                    FROM "Movies" m
                    JOIN "Picks" p ON m."MovieId" = p."MovieId"
                    JOIN "Teams" t ON p."TeamId" = t."TeamId"
                    WHERE t."LeagueId" = $1
                `, [league.LeagueId]);

                for (const movie of moviesToFreeze) {
                    const snapshotQuery = `
                        INSERT INTO "LeagueMovieSnapshots" 
                        ("LeagueId", "MovieId", "SnapshotDate", "FrozenBoxOffice")
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT ("LeagueId", "MovieId") 
                        DO UPDATE SET "FrozenBoxOffice" = EXCLUDED."FrozenBoxOffice"
                    `;

                    // Note: We save the SnapshotDate as 'yesterday' to match 
                    // the actual league end date in the history table.
                    await pool.query(snapshotQuery, [
                        league.LeagueId,
                        movie.MovieId,
                        yesterday, 
                        movie.BoxOffice
                    ]);
                }

                console.log(`Successfully archived ${moviesToFreeze.length} movies for league ${league.LeagueId}`);
            } catch (leagueErr) {
                console.error(`Error snapshotting league ${league.LeagueId}:`, leagueErr);
            }
        }
    } catch (err) {
        console.error('Critical Failure in Snapshot Cron:', err);
    }
}