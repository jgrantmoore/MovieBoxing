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
            'SELECT "LeagueId", "LeagueName", "EndDate" FROM "Leagues" WHERE "EndDate"::date = $1',
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
                    JOIN "TeamMovies" p ON m."MovieId" = p."MovieId"
                    JOIN "Teams" t ON p."TeamId" = t."TeamId"
                    WHERE t."LeagueId" = $1
                `, [league.LeagueId]);

                for (const movie of moviesToFreeze) {
                    const leagueEndDate = league.EndDate.toISOString().split('T')[0];

                    const snapshotQuery = `
                        INSERT INTO "LeagueMovieSnapshots" 
                        ("MovieId", "SnapshotDate", "FrozenBoxOffice")
                        VALUES ($1, $2, $3)
                        ON CONFLICT ("MovieId", "SnapshotDate") 
                        DO UPDATE SET "FrozenBoxOffice" = EXCLUDED."FrozenBoxOffice"
                    `;

                    // And update the parameters passed to the pool.query:
                    await pool.query(snapshotQuery, [
                        movie.MovieId,
                        leagueEndDate,
                        movie.BoxOffice
                    ]);
                }

                const winnerQuery = `
                    UPDATE "Leagues"
                    SET "LeagueWinnerId" = (
                        SELECT t."OwnerUserId"
                        FROM "Teams" t
                        JOIN "TeamMovies" tm ON t."TeamId" = tm."TeamId"
                        JOIN "Leagues" l ON t."LeagueId" = l."LeagueId"
                        JOIN "LeagueMovieSnapshots" lms ON tm."MovieId" = lms."MovieId" 
                            AND l."EndDate"::date = lms."SnapshotDate"
                        WHERE t."LeagueId" = $1
                        GROUP BY t."TeamId", t."OwnerUserId"
                        ORDER BY SUM(lms."FrozenBoxOffice") DESC
                        LIMIT 1
                    )
                    WHERE "LeagueId" = $1
                `;

                await pool.query(winnerQuery, [league.LeagueId]);

                console.log(`Successfully archived ${moviesToFreeze.length} movies for league ${league.LeagueId}`);
            } catch (leagueErr) {
                console.error(`Error snapshotting league ${league.LeagueId}:`, leagueErr);
            }
        }
    } catch (err) {
        console.error('Critical Failure in Snapshot Cron:', err);
    }
}