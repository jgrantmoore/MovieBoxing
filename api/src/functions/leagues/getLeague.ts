import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { poolPromise, sql } from "../../db";
import { League } from "../../models/DatabaseModels";
import jwt from 'jsonwebtoken';

/**
 * Get League data using League ID.
 */
export async function getLeague(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const leagueId = request.query.get('id');
    if (!leagueId) return { status: 400, body: "League ID is required" };

    // Get and verify JWT token
    let userId: number;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
            userId = payload.userId;
        } catch (error) {
            userId = -1; // Invalid token, treat as unauthenticated
        }
    } else {
        userId = -1; // No token provided, treat as unauthenticated
    }


    const pool = await poolPromise;

    const result = await pool.request()
        .input('LeagueId', sql.Int, parseInt(leagueId))
        .query(`
            SELECT 
                -- League Rules & Info
                l.LeagueId,
                l.LeagueName,
                l.StartDate,
                l.EndDate,
                l.StartingNumber,   -- Usually 5
                l.BenchNumber,      -- Usually 3
                l.FreeAgentsAllowed,
                l.JoinPasswordHash,
                l.AdminUserId,
                l.HasDrafted,
                l.IsDrafting,
                
                -- Team & Owner Info
                t.TeamId,
                t.TeamName,
                u.UserId as OwnerUserId,
                u.DisplayName AS OwnerName,
                
                -- Movie Pick Data
                m.MovieId,
                m.Title AS MovieTitle,
                m.BoxOffice,
                m.PosterUrl,
                p.OrderDrafted,    -- Used to determine Start vs Bench
                p.DateAdded
            FROM Leagues l
            JOIN Teams t ON l.LeagueId = t.LeagueId
            JOIN Users u ON t.OwnerUserId = u.UserId
            LEFT JOIN TeamMovies p ON t.TeamId = p.TeamId
            LEFT JOIN Movies m ON p.MovieId = m.MovieId
            WHERE l.LeagueId = @LeagueId
            ORDER BY t.TeamName ASC, p.OrderDrafted ASC;
        `);

    if (result.recordset.length > 0) {
        const rows = result.recordset;

        const joined = rows.some(row => row.OwnerUserId === userId);
        const isPrivate = rows[0].JoinPasswordHash == null ? false : true;
        const isAdmin = rows[0].AdminUserId === userId;

        const leagueData = {
            LeagueId: rows[0].LeagueId,
            LeagueName: rows[0].LeagueName,
            StartDate: rows[0].StartDate,
            EndDate: rows[0].EndDate,
            HasDrafted: rows[0].HasDrafted,
            IsDrafting: rows[0].IsDrafting,
            isPrivate: isPrivate,
            Joined: joined,
            isAdmin: isAdmin,
            Rules: {
                Starting: rows[0].StartingNumber,
                Bench: rows[0].BenchNumber,
                FreeAgents: rows[0].FreeAgentsAllowed
            },
            Teams: [] as any[]
        };

        // Grouping logic
        rows.forEach(row => {
            let team = leagueData.Teams.find(t => t.TeamId === row.TeamId);
            if (!team) {
                team = {
                    TeamId: row.TeamId,
                    TeamName: row.TeamName,
                    OwnerUserId: row.OwnerUserId,
                    Owner: row.OwnerName,
                    Picks: []
                };
                leagueData.Teams.push(team);
            }
            if (row.MovieId) {
                team.Picks.push({
                    MovieId: row.MovieId,
                    Title: row.MovieTitle,
                    BoxOffice: row.BoxOffice,
                    PosterUrl: row.PosterUrl,
                    OrderDrafted: row.OrderDrafted
                });
            }
        });

        return { status: 200, jsonBody: leagueData };
    } else {
        return { status: 404, body: "League not found" };
    }

}

app.http('getLeague', {
    methods: ['GET'],
    route: 'leagues',
    handler: getLeague
});