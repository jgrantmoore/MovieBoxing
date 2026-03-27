import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { getMovieData, verifyJwtToken } from "../../utils/helpers";

interface AssignMovieBody {
    TeamId: number;
    TMDBId: number; 
    SlotNumber: number;
}

export async function assignMovie(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 1. Auth Check (Optional but recommended for Admin routes)
        await verifyJwtToken(request.headers.get('authorization'));

        const body = await request.json() as AssignMovieBody;
        const { TeamId, TMDBId, SlotNumber } = body;

        if (!TeamId || !TMDBId || !SlotNumber) {
            return { status: 400, body: "Missing required fields: TeamId, TMDBId, or SlotNumber." };
        }

        // 2. Resolve Movie: This uses your helper to find or create the movie in your DB
        const movie = await getMovieData(TMDBId);
        const internalMovieId = movie.MovieId;

        const pool = await poolPromise;

        // 3. Get League Context for Rules and Duplicate Checking
        const leagueContext = await pool.request()
            .input('TeamId', sql.Int, TeamId)
            .query(`
                SELECT l.LeagueId, l.StartingNumber 
                FROM Teams t 
                JOIN Leagues l ON t.LeagueId = l.LeagueId 
                WHERE t.TeamId = @TeamId
            `);

        const league = leagueContext.recordset[0];
        if (!league) return { status: 404, body: "League/Team context not found." };

        const isStarting = SlotNumber <= league.StartingNumber ? 1 : 0;

        // 4. Execute the Slot Override with Duplicate Protection
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = transaction.request()
                .input('TeamId', sql.Int, TeamId)
                .input('MovieId', sql.Int, internalMovieId)
                .input('SlotNumber', sql.Int, SlotNumber)
                .input('LeagueId', sql.Int, league.LeagueId)
                .input('IsStarting', sql.Bit, isStarting);

            await request.query(`
                -- Duplicate Check: Ensure no other team in this league has this movie
                IF EXISTS (SELECT 1 FROM TeamMovies WHERE LeagueId = @LeagueId AND MovieId = @MovieId AND TeamId <> @TeamId)
                BEGIN
                    RAISERROR('DUPLICATE_PICK', 16, 1);
                    RETURN;
                END

                -- Delete the current occupant of the slot
                DELETE FROM TeamMovies 
                WHERE TeamId = @TeamId AND OrderDrafted = @SlotNumber;

                -- Assign the new movie
                INSERT INTO TeamMovies (TeamId, MovieId, DateAdded, IsStarting, OrderDrafted, LeagueId)
                VALUES (@TeamId, @MovieId, GETDATE(), @IsStarting, @SlotNumber, @LeagueId);
            `);

            await transaction.commit();
            return { 
                status: 200, 
                jsonBody: { message: `Successfully assigned ${movie.Title} to slot ${SlotNumber}.` } 
            };

        } catch (err) {
            await transaction.rollback();
            if (err.message.includes('DUPLICATE_PICK')) {
                return { status: 400, body: "This movie is already owned by another team in this league." };
            }
            throw err;
        }
    } catch (error) {
        context.error("Admin Manual Assign Error:", error);
        return { status: 500, body: error.message || "Internal Server Error" };
    }
}

app.http('assignMovie', {
    methods: ['POST'],
    authLevel: 'anonymous', 
    route: 'teams/assign-movie',
    handler: assignMovie
});