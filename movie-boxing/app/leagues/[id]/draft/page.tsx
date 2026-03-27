'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { Timer, Search, Info, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function DraftArena({ params }: { params: Promise<{ id: string }> }) {
    const [movies, setMovies] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [timeLeft, setTimeLeft] = useState(299); // 60s shot clock
    const { data: session, status: sessionStatus } = useSession();
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculatedTime, setCalculatedTime] = useState("");

    // Placeholder data - replace with your Azure fetch
    const availableMovies = [
        { id: 1, title: "Animal Farm", date: "2026-05-12", studio: "Warner Bros", poster: "" },
        { id: 2, title: "Resident Evil: Extinction", date: "2026-06-20", studio: "Sony", poster: "" },
    ];

    const currentPick = {
        manager: "Nathan", // Most knowledgeable guy in your league!
        round: 2,
        pickNumber: 14,
    };

    // This value only updates after 500ms of silence
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        // Calculate minutes and remaining seconds
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        // padStart(2, '0') ensures "5" becomes "05"
        const formattedSeconds = String(seconds).padStart(2, '0');

        setCalculatedTime(`${minutes}:${formattedSeconds}`);
    }, [timeLeft]);

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch) {
                setMovies([]); // Clear results if input is empty
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/search?q=${debouncedSearch}`, {
                    method: 'POST',
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
    }, [debouncedSearch]);

    useEffect(() => {
        async function fetchData() {
            if (sessionStatus !== "authenticated") return;

            setLoading(true);

            try {
                const { id } = await params;
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTeams(data.Teams || []);
                    setLeagueInfo(data);
                    const today = new Date();
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [sessionStatus, session?.accessToken, params]);

    const displayedMovies = movies.length > 0 ? movies : availableMovies;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 flex flex-col">
            <Navbar />

            {/* THE WAR ROOM: TIMER & ACTIVE PICK */}
            <header className="bg-red-600 p-4 sticky top-0 z-50 shadow-[0_10px_30px_rgba(220,38,38,0.3)]">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="text-center bg-black/20 p-2 rounded-xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest">Round</p>
                            <p className="text-2xl font-black italic">{currentPick.round}/7</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase opacity-80">On the Clock</p>
                            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                                {currentPick.manager}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/20">
                            <Timer className="animate-pulse" />
                            <span className="text-4xl font-mono font-black italic">{calculatedTime}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-12">

                {/* LEFT: MOVIE POOL */}
                <section className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-red-600">
                            {searchTerm ? "Search Results" : "Top Prospects"}
                        </h2>

                        {/* 2. Styled Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={isSearching ? "SCOUTING..." : "FIND A BLOCKBUSTER..."}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 focus:border-red-600 outline-none transition-all font-black italic uppercase tracking-tighter text-sm placeholder:text-neutral-700"
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Dynamic Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayedMovies.length > 0 ? (
                            displayedMovies.map((movie: any) => (
                                <div key={movie.id} className="group bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 flex justify-between items-center hover:bg-neutral-900 hover:border-red-600/50 transition-all">
                                    <div className="flex items-center gap-4">
                                        {/* Movie Poster from TMDB */}
                                        <div className="h-24 w-16 bg-neutral-800 rounded-xl overflow-hidden flex-shrink-0 border border-neutral-700">
                                            {movie.poster_path ? (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                                    alt={movie.title}
                                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[8px] text-neutral-600 text-center p-1 uppercase font-black">No Poster</div>
                                            )}
                                        </div>
                                        <div className="max-w-[180px]">
                                            <h3 className="font-black uppercase italic tracking-tight text-lg leading-tight line-clamp-2">{movie.title}</h3>
                                            <p className="text-[10px] font-mono text-neutral-400 uppercase mt-1">
                                                {movie.release_date ? movie.release_date : 'TBD'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => console.log("Drafting:", movie.id)}
                                        className="bg-white text-black h-12 w-12 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all active:scale-90 shadow-lg"
                                    >
                                        <CheckCircle2 size={24} strokeWidth={3} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            // No Results State
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-900 rounded-[3rem]">
                                <p className="text-neutral-500 font-black uppercase italic tracking-widest">No movies found in this season window.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* RIGHT: DRAFT BOARD */}
                <aside className="lg:col-span-4 space-y-6">
                    <div className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-[2.5rem]">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-500 mb-6">Recent Activity</h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-neutral-800/50">
                                    <div className="h-8 w-8 bg-neutral-800 rounded-lg flex items-center justify-center text-[10px] font-black italic">
                                        {14 - i}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black uppercase italic">User {i}</p>
                                        <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Picked: Movie Title</p>
                                    </div>
                                    <ChevronRight size={16} className="text-neutral-700" />
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}