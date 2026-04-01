'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { Timer, Search, CheckCircle2, ChevronRight, Trophy, Film } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function DraftArena({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status: sessionStatus } = useSession();
    
    // State
    const [movies, setMovies] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [timeLeft, setTimeLeft] = useState(120); 
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // 1. DRAFT LOGIC CALCULATIONS
    const allPicks = useMemo(() => {
        // Flatten all picks from all teams into one master list, sorted by most recent
        return teams
            .flatMap(t => (t.Picks || []).map((p: any) => ({ ...p, TeamName: t.TeamName })))
            .sort((a, b) => b.PickId - a.PickId);
    }, [teams]);

    const totalPicksMade = allPicks.length;
    const playerCount = teams.length || 1;

    // Snake Draft Logic
    const currentRound = Math.floor(totalPicksMade / playerCount) + 1;
    const isEvenRound = currentRound % 2 === 0;
    const relativePickInRound = totalPicksMade % playerCount;

    // In even rounds, the order reverses
    const activeTeamIndex = isEvenRound 
        ? (playerCount - 1 - relativePickInRound) 
        : relativePickInRound;

    const activeTeam = teams[activeTeamIndex];
    const isMyTurn = String(activeTeam?.OwnerUserId) === String(session?.user?.id);

    // 2. FETCH DATA
    useEffect(() => {
        async function fetchData() {
            if (sessionStatus !== "authenticated") return;
            try {
                const { id } = await params;
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeams(data.Teams || []);
                    setLeagueInfo(data);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [sessionStatus, session?.accessToken, params]);

    // 3. SEARCH LOGIC
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch || !leagueInfo) {
                setMovies([]);
                return;
            }
            setIsSearching(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/search?q=${debouncedSearch}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        StartDate: leagueInfo.StartDate,
                        EndDate: leagueInfo.EndDate
                    })
                });
                const data = await res.json();
                setMovies(data);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearching(false);
            }
        };
        performSearch();
    }, [debouncedSearch, leagueInfo]);

    // 4. DRAFT ACTION
    const handleDraftMovie = async (movie: any) => {
        if (!isMyTurn || !activeTeam) return;

        const orderForThisTeam = (activeTeam.Picks?.length || 0) + 1;
        const startingLimit = leagueInfo?.Rules?.Starting || 5;
        const isStarting = orderForThisTeam <= startingLimit;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamId: activeTeam.TeamId,
                    MovieId: movie.id,
                    OrderDrafted: orderForThisTeam,
                    isStarting: isStarting ? 1 : 0,
                    TMDBData: movie 
                })
            });

            if (res.ok) {
                // Refresh data to move to next pick
                window.location.reload();
            } else {
                const err = await res.json();
                setStatusMessage({ type: 'error', text: err.message || "Draft failed." });
            }
        } catch (err) {
            console.error("Drafting failed:", err);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black italic text-red-600 animate-pulse text-4xl">LOADING ARENA...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 flex flex-col">
            <Navbar />

            {/* DRAFT HEADER (STICKY) */}
            <header className={`p-4 sticky top-0 z-50 shadow-2xl transition-all duration-500 ${isMyTurn ? 'bg-green-600 shadow-green-900/20' : 'bg-red-600 shadow-red-900/20'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="text-center bg-black/20 p-2 px-4 rounded-xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest">Round</p>
                            <p className="text-2xl font-black italic">{currentRound}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase opacity-80">
                                {isMyTurn ? "★ YOUR TURN - PICK NOW" : "On the Clock"}
                            </p>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                                {activeTeam?.TeamName || "No Teams Found"}
                            </h2>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/20">
                        <Timer className={isMyTurn ? "animate-bounce" : "animate-pulse"} />
                        <span className="text-4xl font-mono font-black italic">
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-12 flex-1">
                
                {/* LEFT: MOVIE POOL */}
                <section className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-red-600">Available Prospects</h2>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="FIND A BLOCKBUSTER..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:border-red-600 outline-none transition-all font-black italic uppercase tracking-tighter text-sm"
                            />
                        </div>
                    </div>

                    {statusMessage && (
                        <div className={`p-4 rounded-xl font-bold uppercase text-xs tracking-widest ${statusMessage.type === 'error' ? 'bg-red-600/20 text-red-500' : 'bg-green-600/20 text-green-500'}`}>
                            {statusMessage.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {movies.map((movie: any) => {
                            const isTaken = allPicks.some(p => String(p.MovieId) === String(movie.id));
                            return (
                                <div key={movie.id} className={`group border rounded-3xl p-5 flex justify-between items-center transition-all ${isTaken ? 'bg-neutral-900/20 border-neutral-900 grayscale opacity-50' : 'bg-neutral-900/50 border-neutral-800 hover:border-red-600/50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="h-20 w-14 bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
                                            {movie.poster_path && <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} className="h-full w-full object-cover" />}
                                        </div>
                                        <div>
                                            <h3 className="font-black uppercase italic tracking-tight text-lg leading-tight line-clamp-1">{movie.title}</h3>
                                            <p className="text-[10px] font-mono text-neutral-400 uppercase">{isTaken ? "TAKEN" : (movie.release_date || 'TBD')}</p>
                                        </div>
                                    </div>
                                    <button
                                        disabled={isTaken || !isMyTurn}
                                        onClick={() => handleDraftMovie(movie)}
                                        className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${isTaken ? 'bg-transparent text-neutral-800' : isMyTurn ? 'bg-white text-black hover:bg-green-500 hover:text-white' : 'bg-neutral-900 text-neutral-700'}`}
                                    >
                                        {isTaken ? <CheckCircle2 size={24} /> : <ChevronRight size={24} strokeWidth={3} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* RIGHT: DRAFT BOARD */}
                <aside className="lg:col-span-4 space-y-6">
                    <div className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-[2.5rem]">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500 mb-6 flex items-center gap-2">
                            <Film size={14} /> Draft Board
                        </h2>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {allPicks.map((pick, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-neutral-800/50">
                                    <div className="h-8 w-8 bg-neutral-800 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                                        {totalPicksMade - i}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase italic">{pick.TeamName}</p>
                                        <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">{pick.MovieTitle}</p>
                                    </div>
                                </div>
                            ))}
                            {allPicks.length === 0 && <p className="text-center text-neutral-700 text-[10px] font-black uppercase italic py-10">The board is clear. Make history.</p>}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}