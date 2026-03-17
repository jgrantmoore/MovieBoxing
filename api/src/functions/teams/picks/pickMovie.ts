import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../../db";
import { PickMovieBody } from "../../../models/DatabaseModels";
import { verifyJwtToken, getMovieData } from "../../../utils/helpers";

export async function pickMovie(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    let ownerUserId: number;
    try {
        ownerUserId = await verifyJwtToken(request.headers.get('authorization'));
    } catch (error) {
        return { status: 401, body: error.message };
    }

    const body = await request.json() as Partial<PickMovieBody>;
    if (!body.TeamId || body.tmdbId === undefined) {
        return { status: 400, body: "Missing TeamId or tmdbId" };
    }

    try {
        const pool = await poolPromise;

        // 1. Resolve Movie: Ensure movie exists and get INTERNAL MovieId
        const movie = await getMovieData(body.tmdbId);
        const internalMovieId = movie.MovieId;

        // 2. Multi-Validation Query: Check ownership, availability, and limits in ONE TRIP
        const validationResult = await pool.request()
            .input('TeamId', sql.Int, body.TeamId)
            .input('LeagueId', (await pool.request() // Nested lookups for context
                .input('tid', sql.Int, body.TeamId).query('SELECT LeagueId FROM Teams WHERE TeamId = @tid')).recordset[0]?.LeagueId, sql.Int)
            .input('MovieId', sql.Int, internalMovieId)
            .input('OwnerId', sql.Int, ownerUserId)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM TeamMovies WHERE LeagueId = l.LeagueId AND MovieId = @MovieId) as AlreadyPicked,
                    (SELECT COUNT(*) FROM TeamMovies WHERE TeamId = @TeamId) as CurrentPicks,
                    t.OwnerUserId,
                    l.StartingNumber,
                    l.BenchNumber,
                    l.LeagueId,
                    l.StartDate,
                    l.EndDate,
                    l.PreferredReleaseDate,
                    m.USReleaseDate,
                    m.InternationalReleaseDate
                FROM Teams t
                JOIN Leagues l ON t.LeagueId = l.LeagueId
                JOIN Movies m ON m.MovieId = @MovieId
                WHERE t.TeamId = @TeamId
            `);

        const stats = validationResult.recordset[0];

        // 3. Early Returns (Validation)
        if (!stats) return { status: 404, body: "Team not found" };
        if (stats.OwnerUserId !== ownerUserId) return { status: 403, body: "Forbidden" };
        if (stats.AlreadyPicked > 0) return { status: 400, body: "Movie already taken in this league" };
        
        const totalAllowed = stats.StartingNumber + stats.BenchNumber;
        if (stats.CurrentPicks >= totalAllowed) return { status: 400, body: "Roster full" };

        // Check if movie release date is within league date range
        const releaseDate = new Date(stats.PreferredReleaseDate === 'us' ? stats.USReleaseDate : stats.InternationalReleaseDate);
        const leagueStartDate = new Date(stats.StartDate);
        const leagueEndDate = new Date(stats.EndDate);
        
        if (releaseDate < leagueStartDate || releaseDate > leagueEndDate) {
            return { status: 400, body: "Movie release date is outside the league's active period" };
        }

        // 4. Determine Status and Execute
        const isBench = stats.CurrentPicks >= stats.StartingNumber;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            const request = transaction.request()
                .input('TeamId', sql.Int, body.TeamId)
                .input('MovieId', sql.Int, internalMovieId)
                .input('LeagueId', sql.Int, stats.LeagueId)
                .input('IsStarting', sql.Bit, !isBench);
            
            const result = await request.query(`
                INSERT INTO TeamMovies (TeamId, MovieId, DateAdded, IsStarting, OrderDrafted, LeagueId)
                OUTPUT INSERTED.*
                VALUES (
                    @TeamId, 
                    @MovieId, 
                    GETDATE(), 
                    @IsStarting, 
                    (SELECT ISNULL(MAX(OrderDrafted), 0) + 1 FROM TeamMovies WHERE TeamId = @TeamId), 
                    @LeagueId
                )
            `);
            
            await transaction.commit();
            return { status: 201, jsonBody: result.recordset[0] };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        context.log(`Error: ${error.message}`);
        return { status: 500, body: "Internal server error" };
    }
}

app.http('pickMovie', {
    methods: ['POST'],
    route: 'teams/pickmovie',
    handler: pickMovie
});