'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, Socket } from "socket.io-client";
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { Search, CheckCircle2, ChevronRight, Users, ArrowRight, Film } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function DraftArena({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status: sessionStatus } = useSession();
    const socketRef = useRef<Socket | null>(null);

    const [movies, setMovies] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [viewingTeamId, setViewingTeamId] = useState<number | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const [isFinishedModalOpen, setIsFinishedModalOpen] = useState(false);

    const isDraftFinished = useMemo(() => {
        if (!leagueInfo?.Rules || !teams.length) return false;

        const slotsPerTeam = (leagueInfo.Rules.Starting || 0) + (leagueInfo.Rules.Bench || 0);
        const totalSlotsInLeague = slotsPerTeam * teams.length;

        // Flatten all picks from all teams
        const totalPicksMade = teams.reduce((acc, team) => acc + (team.Picks?.length || 0), 0);

        return totalPicksMade >= totalSlotsInLeague && totalSlotsInLeague > 0;
    }, [leagueInfo, teams]);

    // Auto-open modal when finished
    useEffect(() => {
        if (isDraftFinished) {
            setIsFinishedModalOpen(true);
        }
    }, [isDraftFinished]);

    // 1. DATA REFRESH LOGIC (Added cache busting timestamp)
    const fetchData = useCallback(async () => {
        if (sessionStatus !== "authenticated") return;
        try {
            const { id } = await params;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}&t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${session?.accessToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeams(data.Teams || []);
                setLeagueInfo(data);
                if (!viewingTeamId) {
                    const myTeam = data.Teams.find((t: any) => String(t.OwnerUserId) === String(session?.user?.id));
                    if (myTeam) setViewingTeamId(myTeam.TeamId);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [sessionStatus, session?.accessToken, params, viewingTeamId, session?.user?.id]);

    // 2. SNAKE LOGIC
    const getDraftOrderAtPick = useCallback((pickNum: number) => {
        if (!teams.length) return null;
        const totalTeams = teams.length;
        const round = Math.ceil(pickNum / totalTeams);
        const isEvenRound = round % 2 === 0;
        const relativePos = (pickNum - 1) % totalTeams;
        return isEvenRound ? (totalTeams - relativePos) : (relativePos + 1);
    }, [teams.length]);

    const draftState = useMemo(() => {
        if (!leagueInfo || !teams.length) return null;

        const currentPick = leagueInfo.DraftUsersTurn;
        const slotsPerTeam = (leagueInfo.Rules.Starting || 0) + (leagueInfo.Rules.Bench || 0);
        const totalPicksInLeague = slotsPerTeam * teams.length;

        // Check if we are currently on the walk-off pick
        const isLastPick = currentPick === totalPicksInLeague;

        const currentOrderNeeded = getDraftOrderAtPick(currentPick);
        // Only look for a next team if there IS a next pick
        const nextOrderNeeded = !isLastPick ? getDraftOrderAtPick(currentPick + 1) : null;

        const activeTeam = teams.find(t => t.DraftOrder === currentOrderNeeded);
        const nextTeam = nextOrderNeeded ? teams.find(t => t.DraftOrder === nextOrderNeeded) : null;
        const isMyTurn = String(activeTeam?.OwnerUserId) === String(session?.user?.id);
        const currentRound = Math.ceil(currentPick / teams.length);
        console.log("Current Round:", currentRound, "Current Pick:", currentPick, "Active Team:", activeTeam?.TeamName, "Next Team:", nextTeam?.TeamName, "Is My Turn?", isMyTurn);
        const allPicks = teams.flatMap(t => (t.Picks || []).map((p: any) => ({
            ...p,
            TeamName: t.TeamName,
            // Ensure we have a consistent reference to the TMDB ID
            tmdbReference: p.TMDBId
        })));

        return {
            activeTeam,
            nextTeam,
            isMyTurn,
            currentRound,
            allPicks,
            isLastPick, // Add this
            totalPicksInLeague // Add this
        };
    }, [leagueInfo, teams, getDraftOrderAtPick, session?.user?.id]);

    // 3. SOCKET CONNECTION
    useEffect(() => {
        if (sessionStatus !== "authenticated") return;

        const initSocket = async () => {
            const { id } = await params;

            // Connect once
            if (!socketRef.current) {
                socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
                    // This helps prevent the "interrupted" error on refresh
                    closeOnBeforeunload: true,
                    autoConnect: true,
                    transports: ["websocket"], // Skip polling entirely
                    upgrade: false
                });
                socketRef.current.on("connect", () => {
                    console.log("Socket connected:", socketRef.current?.id);
                    socketRef.current?.emit("joinDraft", id);
                });

                socketRef.current.on("draftUpdate", (data) => {
                    console.log("Socket: Draft update received", data);
                    fetchData();
                    setStatusMessage({ type: 'success', text: "New pick added to the board!" });
                });
            }
        };

        initSocket();
        fetchData();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [sessionStatus, fetchData, params]);

    // 4. MOVIE SEARCH
    useEffect(() => {
        if (!debouncedSearch || !leagueInfo) return setMovies([]);
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/search?q=${debouncedSearch}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ StartDate: leagueInfo.StartDate, EndDate: leagueInfo.EndDate })
        })
            .then(res => res.json())
            .then(data => setMovies(data))
            .catch(err => console.error(err));
    }, [debouncedSearch, leagueInfo]);

    // 5. DRAFT ACTION
    const handleDraftMovie = async (movie: any) => {
        if (!draftState?.isMyTurn || !draftState.activeTeam) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drafts/pick`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({ TeamId: draftState.activeTeam.TeamId, tmdbId: movie.id })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Pick confirmed!" });
                setSearchTerm(""); // Clear search on success
                await fetchData(); // Immediate local update
            } else {
                const errText = await res.text();
                setStatusMessage({ type: 'error', text: errText || "Failed to draft." });
            }
        } catch (err) {
            console.error(err);
            setStatusMessage({ type: 'error', text: "Network error during drafting." });
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black italic text-red-600 animate-pulse text-4xl">LOADING ARENA...</div>;

    const selectedTeam = teams.find(t => t.TeamId === viewingTeamId) || teams[0];

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 flex flex-col">
            <Navbar />

            {/* HEADER */}
            <header className={`p-4 sticky top-0 z-50 shadow-2xl transition-all duration-500 ${draftState?.isMyTurn ? 'bg-green-600' : 'bg-red-600'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="text-center bg-black/20 p-2 px-4 rounded-xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest">Round</p>
                            <p className="text-2xl font-black italic">{draftState?.currentRound}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase opacity-80">{draftState?.isMyTurn ? "★ YOUR TURN" : "On the Clock"}</p>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{draftState?.activeTeam?.TeamName}</h2>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-12 items-start">
                {/* DRAFT FINISHED MODAL */}
                {isFinishedModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40">
                        <div className="bg-slate-900 border-2 border-green-500 w-full max-w-md rounded-[3rem] p-10 shadow-[0_0_50px_rgba(34,197,94,0.3)] text-center transform animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                                <CheckCircle2 size={40} className="text-black" />
                            </div>

                            <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 text-white">
                                Draft Finished
                            </h2>
                            <p className="text-neutral-400 font-medium mb-8">
                                All teams have filled their rosters. The box office battle begins now.
                            </p>

                            <button
                                onClick={() => window.location.href = `/leagues/${leagueInfo.LeagueId}`}
                                className="w-full bg-white hover:bg-green-500 text-black hover:text-white py-4 rounded-2xl font-black uppercase italic transition-all flex items-center justify-center gap-2 group"
                            >
                                Return to League Page
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* LEFT: POOL */}
                <section className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-red-600">Available Prospects</h2>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="SEARCH MOVIES..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:border-red-600 outline-none uppercase font-black italic"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {movies.map((movie) => {
                            // Look for the TMDB ID match
                            const takenByTeam = draftState?.allPicks.find(p =>
                                String(p.tmdbReference) === String(movie.id)
                            );
                            const isTaken = !!takenByTeam;

                            return (
                                <div
                                    key={movie.id}
                                    className={`group border rounded-3xl p-5 flex justify-between items-center transition-all relative overflow-hidden ${isTaken
                                        ? 'opacity-40 grayscale bg-neutral-950 border-neutral-900'
                                        : 'bg-neutral-900/50 border-neutral-800 hover:border-red-600/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="h-20 w-14 bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 relative">
                                            {movie.poster_path && (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                                    alt="poster"
                                                    className="h-full w-full object-cover"
                                                />
                                            )}
                                            {/* 2. Visual "TAKEN" overlay on the poster itself */}
                                            {isTaken && (
                                                <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                                                    <CheckCircle2 size={20} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black uppercase italic tracking-tight text-lg leading-tight">
                                                    {movie.title}
                                                </h3>
                                                {/* 3. Small badge showing WHO took it */}
                                                {isTaken && (
                                                    <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black uppercase italic">
                                                        Taken by {takenByTeam.TeamName}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-mono text-neutral-400">
                                                {movie.release_date}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. Disable interaction and update the icon */}
                                    <button
                                        disabled={isTaken || !draftState?.isMyTurn}
                                        onClick={() => handleDraftMovie(movie)}
                                        className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all relative z-10 ${isTaken
                                            ? 'text-neutral-800 cursor-not-allowed'
                                            : draftState?.isMyTurn
                                                ? 'bg-white text-black hover:bg-green-500 hover:text-white shadow-lg'
                                                : 'bg-neutral-900 text-neutral-700'
                                            }`}
                                    >
                                        {isTaken ? (
                                            <CheckCircle2 size={24} />
                                        ) : (
                                            <ChevronRight size={24} strokeWidth={3} />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* RIGHT: QUEUE & ROSTER */}
                <aside className="lg:col-span-4 space-y-6">
                    {/* 1. THE SNAKE QUEUE */}
                    <div className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-[2.5rem] relative overflow-hidden">

                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500 mb-6 flex items-center gap-2">
                            <ArrowRight size={14} className="text-red-600" /> Draft Sequence
                        </h2>

                        <div className="space-y-4 relative">
                            {/* The Snake Line Connector */}
                            <div className="absolute left-[19px] top-10 bottom-10 w-[2px] bg-gradient-to-b from-green-500 via-red-600 to-neutral-800" />

                            {/* CURRENT PICK */}
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="h-10 w-10 shrink-0 bg-green-500 text-black rounded-full flex flex-col items-center justify-center border-4 border-slate-950 ring-2 ring-green-500/20">
                                    <span className="text-[10px] font-black leading-none">{leagueInfo?.DraftUsersTurn}</span>
                                </div>
                                <div className="flex-1 p-4 rounded-2xl bg-white text-black border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                    <p className="text-[10px] font-bold uppercase opacity-60 tracking-tighter leading-none mb-1">On the clock</p>
                                    <div className="flex justify-between items-end">
                                        <p className="font-black uppercase italic leading-tight text-lg">{draftState?.activeTeam?.Owner}</p>
                                        <p className="text-[10px] font-mono font-bold bg-black/10 px-2 rounded">SLOT {draftState?.activeTeam?.DraftOrder}</p>
                                    </div>
                                </div>
                            </div>

                            {/* UP NEXT */}
                            {!draftState?.isLastPick ? (
                                <div className="flex items-center gap-4 relative z-10 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                                    <div className="h-10 w-10 shrink-0 bg-neutral-800 text-neutral-400 rounded-full flex flex-col items-center justify-center border-4 border-slate-950 ring-1 ring-white/10">
                                        <span className="text-[10px] font-black leading-none">{leagueInfo?.DraftUsersTurn + 1}</span>
                                    </div>
                                    <div className="flex-1 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                                        <p className="text-[10px] font-bold uppercase tracking-tighter leading-none mb-1 text-neutral-500">Up Next</p>
                                        <div className="flex justify-between items-end">
                                            <p className="font-black uppercase italic leading-tight text-sm text-neutral-300">{draftState?.nextTeam?.Owner || "END"}</p>
                                            <p className="text-[9px] font-mono font-bold text-neutral-600">SLOT {draftState?.nextTeam?.DraftOrder}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="h-10 w-10 shrink-0 bg-red-950 text-red-500 rounded-full flex items-center justify-center border-4 border-slate-950 ring-1 ring-red-500/20">
                                        <Film size={14} />
                                    </div>
                                    <div className="flex-1 p-4 rounded-2xl border-2 border-dashed border-red-900/50 bg-red-950/10">
                                        <p className="text-[10px] font-black uppercase text-red-600 tracking-widest italic">
                                            No More Picks
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TURNAROUND INDICATOR */}
                            {(!draftState?.isLastPick && draftState?.activeTeam?.DraftOrder === draftState?.nextTeam?.DraftOrder) && (
                                <div className="ml-14 flex items-center gap-2 py-1">
                                    <div className="h-px w-4 bg-red-600" />
                                    <span className="text-[9px] font-black uppercase text-red-600 animate-pulse">
                                        Snaking Around: Back-to-Back Pick
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-neutral-600">
                            <span>Snake Logic: Active</span>
                            <span className="text-neutral-400">Total Picks: {draftState?.totalPicksInLeague}</span>
                        </div>
                    </div>

                    {/* 2. TEAM ROSTER VIEWER */}
                    <div className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-[2.5rem] flex flex-col">
                        <div className="flex justify-between items-start mb-6 gap-2">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500 flex items-center gap-2 mb-1">
                                    <Users size={14} /> Team Rosters
                                </h2>
                                <select
                                    value={viewingTeamId || ""}
                                    onChange={(e) => setViewingTeamId(Number(e.target.value))}
                                    className="bg-black border border-neutral-800 rounded-lg text-[10px] font-black uppercase p-1.5 px-2 outline-none text-white focus:border-red-600 transition-colors cursor-pointer"
                                >
                                    {teams.map(t => (
                                        <option key={t.TeamId} value={t.TeamId}>
                                            {t.TeamName} {String(t.OwnerUserId) === String(session?.user?.id) ? "★" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>

                        <div className="space-y-2">
                            {Array.from({
                                length: Number(leagueInfo?.Rules.Starting || 0) + Number(leagueInfo?.Rules.Bench || 0)
                            }).map((_, idx) => {
                                const slotNumber = idx + 1;
                                // Robust check for the pick in the selected team's roster
                                const pick = selectedTeam?.Picks?.find((p: any) => Number(p.OrderDrafted) === slotNumber);
                                const isBench = slotNumber > Number(leagueInfo?.Rules.Starting || 5);

                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${pick
                                            ? 'bg-black/40 border-neutral-800'
                                            : 'bg-transparent border-neutral-900 border-dashed opacity-40'
                                            }`}
                                    >
                                        <div className="text-[9px] font-mono text-neutral-600 w-4">{slotNumber}</div>
                                        <div className="flex-1">
                                            {pick ? (
                                                <>
                                                    <p className="text-[11px] font-black uppercase italic leading-tight text-white">
                                                        {pick.Title || pick.MovieTitle || "Unknown Movie"}
                                                    </p>
                                                    <p className="text-[8px] font-mono uppercase text-red-600">
                                                        {isBench ? "BENCH" : "STARTER"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-[10px] font-black uppercase italic text-neutral-700">
                                                    Empty {isBench ? "Bench" : "Slot"}
                                                </p>
                                            )}
                                        </div>
                                        {pick && <Film size={12} className="text-neutral-700 shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}