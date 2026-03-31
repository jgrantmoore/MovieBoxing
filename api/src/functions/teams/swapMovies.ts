import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";

export async function swapMovies(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { TeamId, Slot1, Slot2 } = await request.json() as any;

        if (!TeamId || Slot1 === undefined || Slot2 === undefined) {
            return { status: 400, body: "Missing TeamId, Slot1, or Slot2" };
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Fetch League Rules and the specific Movies being swapped
            const contextReq = await transaction.request()
                .input('TeamId', sql.Int, TeamId)
                .input('Slot1', sql.Int, Slot1)
                .input('Slot2', sql.Int, Slot2)
                .query(`
                    SELECT l.StartingNumber, tm.OrderDrafted, m.InternationalReleaseDate, m.Title
                    FROM Teams t
                    JOIN Leagues l ON t.LeagueId = l.LeagueId
                    JOIN TeamMovies tm ON t.TeamId = tm.TeamId
                    JOIN Movies m ON tm.MovieId = m.MovieId
                    WHERE t.TeamId = @TeamId AND (tm.OrderDrafted = @Slot1 OR tm.OrderDrafted = @Slot2)
                `);
            
            const startingLimit = contextReq.recordset[0].StartingNumber;
            const movies = contextReq.recordset;

            // 2. RELEASE CHECK: If a movie is moving from Bench ( > Limit) to Starter ( <= Limit)
            // It MUST NOT be released yet.
            const today = new Date();
            for (const movie of movies) {
                const currentSlot = movie.OrderDrafted;
                const targetSlot = (currentSlot === Slot1) ? Slot2 : Slot1;

                const isCurrentlyBench = currentSlot > startingLimit;
                const isTargetStarter = targetSlot <= startingLimit;

                if (isCurrentlyBench && isTargetStarter) {
                    const releaseDate = new Date(movie.InternationalReleaseDate);
                    if (releaseDate <= today) {
                        await transaction.rollback();
                        return { 
                            status: 400, 
                            body: `Illegal Move: "${movie.Title}" has already been released and cannot be moved to a starting slot.` 
                        };
                    }
                }
            }

            // 3. Perform the Swap
            await transaction.request()
                .input('TeamId', sql.Int, TeamId)
                .input('Slot1', sql.Int, Slot1)
                .input('Slot2', sql.Int, Slot2)
                .input('Limit', sql.Int, startingLimit)
                .query(`
                    UPDATE TeamMovies SET OrderDrafted = -1 WHERE TeamId = @TeamId AND OrderDrafted = @Slot1;

                    UPDATE TeamMovies 
                    SET OrderDrafted = @Slot1, 
                        isStarting = CASE WHEN @Slot1 <= @Limit THEN 1 ELSE 0 END 
                    WHERE TeamId = @TeamId AND OrderDrafted = @Slot2;

                    UPDATE TeamMovies 
                    SET OrderDrafted = @Slot2, 
                        isStarting = CASE WHEN @Slot2 <= @Limit THEN 1 ELSE 0 END 
                    WHERE TeamId = @TeamId AND OrderDrafted = -1;
                `);

            await transaction.commit();
            return { status: 200, body: "Swap successful" };

        } catch (err) {
            await transaction.rollback();
            return { status: 500, body: "Database error during swap." };
        }
    } catch (error) {
        return { status: 500, body: "Internal Server Error" };
    }
}

app.http('swapMovies', {
    methods: ['POST'],
    route: 'teams/swap',
    handler: swapMovies
});