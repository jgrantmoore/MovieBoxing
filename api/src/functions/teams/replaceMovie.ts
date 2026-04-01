// teams/replace.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { getMovieData, verifyJwtToken } from "../../utils/helpers";

export async function replaceMovie(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const userId = await verifyJwtToken(request.headers.get('authorization'));
        const { TeamId, TMDBId, Slot } = await request.json() as any;

        if (!TeamId || !TMDBId || !Slot) {
            return { status: 400, body: "Missing TeamId, TMDBId, or Slot." };
        }

        // 1. Resolve Movie using your helper (fetches from TMDB and syncs to your Movies table)
        const movie = await getMovieData(TMDBId);

        // 2. Business Rule: Cannot add a movie that already released
        const today = new Date();
        if (new Date(movie.InternationalReleaseDate) <= today) {
            return { status: 400, body: "Cannot sign a movie that has already premiered." };
        }

        const pool = await poolPromise;

        // 3. Get League Rules and check if the user actually owns the team
        const teamCheck = await pool.request()
            .input('TeamId', sql.Int, TeamId)
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT l.LeagueId, l.StartingNumber, t.OwnerUserId 
                FROM Teams t 
                JOIN Leagues l ON t.LeagueId = l.LeagueId 
                WHERE t.TeamId = @TeamId
            `);

        const team = teamCheck.recordset[0];
        if (!team) return { status: 404, body: "Team not found." };

        // Auth check: Ensure the person logged in is the owner (unless you want admins to use this too)
        if (team.OwnerUserId !== userId) {
            return { status: 403, body: "You do not have Front Office authority for this team." };
        }

        const isStarting = Slot <= team.StartingNumber ? 1 : 0;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Inside the transaction block in your Azure Function
        try {
            const req = transaction.request()
                .input('TeamId', sql.Int, TeamId)
                .input('MovieId', sql.Int, movie.MovieId)
                .input('Slot', sql.Int, Slot)
                .input('LeagueId', sql.Int, team.LeagueId)
                .input('IsStarting', sql.Bit, isStarting);

            await req.query(`
        -- 1. CALENDAR MONTH COOLDOWN CHECK
        -- Checks if any movie was added to this team during the CURRENT calendar month
        IF EXISTS (
            SELECT 1 
            FROM TeamMovies 
            WHERE TeamId = @TeamId 
            AND MONTH(DateAdded) = MONTH(GETDATE()) 
            AND YEAR(DateAdded) = YEAR(GETDATE())
        )
        BEGIN
            RAISERROR('MONTHLY_LIMIT_REACHED', 16, 1);
            RETURN;
        END

        -- 2. DUPLICATE CHECK (League-wide)
        IF EXISTS (SELECT 1 FROM TeamMovies WHERE LeagueId = @LeagueId AND MovieId = @MovieId)
        BEGIN
            RAISERROR('MOVIE_ALREADY_OWNED', 16, 1);
            RETURN;
        END

        -- 4. EXECUTE SWAP
        DELETE FROM TeamMovies WHERE TeamId = @TeamId AND OrderDrafted = @Slot;

        INSERT INTO TeamMovies (TeamId, MovieId, DateAdded, IsStarting, OrderDrafted, LeagueId)
        VALUES (@TeamId, @MovieId, GETDATE(), @IsStarting, @Slot, @LeagueId);
    `);

            await transaction.commit();
            return { status: 200, body: "Transaction Complete!" };

        } catch (err) {
            await transaction.rollback();

            // Handle specific error messages to give the user clear feedback
            if (err.message.includes('MONTHLY_LIMIT_REACHED')) {
                return { status: 400, body: "Front Office Error: You have already used your monthly free agent signing." };
            }
            if (err.message.includes('MOVIE_ALREADY_OWNED')) {
                return { status: 400, body: "Scouting Error: That movie is already on a roster in this league." };
            }
            if (err.message.includes('CANNOT_RELEASE_PREMIERED')) {
                return { status: 400, body: "Illegal Move: You cannot release a movie that has already premiered." };
            }
            throw err;
        }
    } catch (error) {
        return { status: 500, body: error.message };
    }
}

app.http('replaceMovie', {
    methods: ['POST'],
    route: 'teams/replace',
    handler: replaceMovie
});