import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import jwt from 'jsonwebtoken';


/**
 * Delete a league (admin only).
 */
export async function deleteLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const url = new URL(request.url);
    const leagueId = url.searchParams.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { status: 401, body: "Unauthorized" };
    }
    const token = authHeader.substring(7);

    let userId: number;
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = payload.userId;
    } catch (error) {
        return { status: 401, body: "Invalid token" };
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Verify Admin Status first before doing anything
        const adminCheck = await transaction.request()
            .input('LeagueId', sql.Int, leagueId)
            .query(`SELECT AdminUserId FROM Leagues WHERE LeagueId = @LeagueId`);

        if (adminCheck.recordset.length === 0) {
            await transaction.rollback();
            return { status: 404, body: "League not found" };
        }

        if (adminCheck.recordset[0].AdminUserId !== userId) {
            await transaction.rollback();
            return { status: 403, body: "Only the Commissioner can scrap this league." };
        }

        const request = transaction.request();
        request.input('LeagueId', sql.Int, leagueId);

        // Execute deletions in the correct order to satisfy FK constraints
        await request.query(`
            -- Delete Trade Proposals involving teams in this league
            DELETE FROM TradeProposals 
            WHERE ProposingTeamId IN (SELECT TeamId FROM Teams WHERE LeagueId = @LeagueId)
               OR TargetTeamId IN (SELECT TeamId FROM Teams WHERE LeagueId = @LeagueId);

            -- Delete Picks
            DELETE FROM TeamMovies WHERE LeagueId = @LeagueId;

            -- Delete Snapshots
            DELETE FROM LeagueMovieSnapshots WHERE LeagueId = @LeagueId;

            -- Delete Draft Plans
            DELETE FROM DraftPlans WHERE LeagueId = @LeagueId;

            -- Delete Teams
            DELETE FROM Teams WHERE LeagueId = @LeagueId;

            -- Finally, Delete the League
            DELETE FROM Leagues WHERE LeagueId = @LeagueId;
        `);

        await transaction.commit();
        return { status: 200, body: "League and all associated data purged." };

    } catch (error) {
        if (transaction) await transaction.rollback();
        context.log(`Error purging league: ${error}`);
        return { status: 500, body: "Internal server error during purge." };
    }
}

app.http('deleteLeague', {
    methods: ['DELETE'],
    route: 'leagues/delete',
    handler: deleteLeague
});