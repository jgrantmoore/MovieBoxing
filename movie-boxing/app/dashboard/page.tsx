'use client';

import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SessionGuard } from '../components/SessionGuard';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const { data: session } = useSession();
    const [teams, setTeams] = useState<any[]>([]);
    const [topMovies, setTopMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());

    const router = useRouter();

    const STARTING_SLOTS = 5;
    const TOTAL_SLOTS = 8;

    useEffect(() => {
        document.title = "Movie Boxing - Dashboard";
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (!session?.accessToken) return;

            setLoading(true);
            try {
                // 1. Fetch user's teams
                const teamRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/my-teams`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });

                // 2. Fetch top performing movies
                const movieRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/top-performing-movies?id=${session.user.id}`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });

                if (teamRes.ok) setTeams(await teamRes.json());
                if (movieRes.ok) setTopMovies(await movieRes.json());

                if (teamRes.status === 401 || movieRes.status === 401) {
                    // Token might be expired or invalid, handle logout or token refresh here if needed
                    router.replace('/login');
                }

            } catch (err) {
                console.error("Dashboard Load Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [session]);

    const toggleBench = (leagueName: string) => {
        const next = new Set(openBench);
        if (next.has(leagueName)) next.delete(leagueName);
        else next.add(leagueName);
        setOpenBench(next);
    };

    const formatCurrency = (amount: number) => {
        if (amount <= 999999999) {
            return `$${(amount / 1000000).toFixed(2)}M`;
        } else if (amount >= 999999999) {
            return `$${(amount / 1000000000).toFixed(3)}B`;
        } else {
            return `$${(amount / 1000).toFixed(2)}K`;
        }
    };

    return (
        <SessionGuard>
            <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
                <Navbar />

                <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
                    <header className="mb-16 text-center md:text-left">
                        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
                            Your <span className="text-red-600">Dashboard</span>
                        </h1>
                        <p className="text-neutral-500 font-mono uppercase tracking-widest text-sm">
                            Welcome back, {session?.user?.name || 'Contender'}
                        </p>
                    </header>

                    {/* Section 1: Top Performing Movies (The SQL Query Result) */}
                    <section className="mb-20">
                        <h2 className="text-2xl font-black uppercase italic mb-8 border-l-4 border-white pl-4">
                            Top Performers
                        </h2>
                        {loading ? (
                            <div className="py-20 text-center animate-pulse font-black italic text-neutral-700 text-4xl">
                                SYNCING DATA...
                            </div>
                        ) : topMovies.length > 0 ? (
                            <div className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-6 md:p-10 shadow-2xl">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {
                                        topMovies.map((movie) => (
                                            <MovieCard
                                                key={movie.MovieId}
                                                movieId={movie.MovieId}
                                                title={movie.Title}
                                                posterUrl={movie.PosterUrl}
                                                boxOffice={movie.BoxOffice}
                                                releaseDate={movie.InternationalReleaseDate}
                                                isBench={false}
                                            />
                                        ))
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="bg-neutral-900/50 rounded-3xl border-2 border-dashed border-neutral-800 p-20 text-center items-center flex flex-col">
                                <p className="text-neutral-500 mb-6 italic">No top performers found.</p>
                                <div className='flex gap-4 md:flex-row flex-col items-center'>
                                    <Link href="/leagues" className="bg-red-600 text-white px-8 py-3 md:mb-0 mb-2 w-fit rounded-xl font-black uppercase italic hover:bg-red-700 transition-all">
                                        Find a League
                                    </Link>
                                    <Link href="/leagues/create" className="bg-red-600 text-white px-8 py-3 w-fit rounded-xl font-black uppercase italic hover:bg-red-700 transition-all">
                                        Create a League
                                    </Link>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Section 2: Active Leagues & Teams */}
                    <section className="space-y-12">
                        <h2 className="text-2xl font-black uppercase italic mb-8 border-l-4 border-white pl-4">
                            Active Leagues
                        </h2>

                        {loading ? (
                            <div className="py-20 text-center animate-pulse font-black italic text-neutral-700 text-4xl">
                                SYNCING DATA...
                            </div>
                        ) : teams.length > 0 ? (
                            teams.map((team) => {
                                const totalBoxOffice = team.Picks.reduce((sum: number, pick: any) => {
                                    return pick.OrderDrafted <= team.StartingNumber ? sum + (pick.BoxOffice || 0) : sum;
                                }, 0);

                                return (
                                    <div key={team.LeagueName} className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-6 md:p-10 shadow-2xl">
                                        <div className="flex flex-col md:flex-row justify-between md:items-end items-start md:items-center mb-8 gap-6">
                                            <div>
                                                <Link href={`/leagues/${team.LeagueId}`} className="text-3xl font-black uppercase italic text-red-600 leading-none hover:underline">
                                                    <h3 className="text-3xl font-black uppercase italic text-red-600 leading-none">{team.LeagueName}</h3>
                                                </Link>
                                                <p className="text-neutral-500 font-mono text-md mt-2">{team.TeamName}</p>

                                            </div>

                                            <div className="flex items-center gap-8 w-full md:w-auto justify-between border-t border-neutral-800 pt-6 md:border-none md:pt-0">
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Team Total</p>
                                                    <p className="text-3xl font-mono font-black">{formatCurrency(totalBoxOffice)}</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleBench(team.LeagueName)}
                                                    className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold uppercase tracking-tight transition-colors"
                                                >
                                                    {openBench.has(team.LeagueName) ? 'Hide Bench' : 'Show Bench'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                            {Array.from({ length: openBench.has(team.LeagueName) ? (team.BenchNumber + team.StartingNumber) : team.StartingNumber }).map((_, idx) => {
                                                const slot = idx + 1;
                                                const pick = team.Picks.find((p: any) => p.OrderDrafted === slot);
                                                return pick ? (
                                                    <MovieCard
                                                        key={slot}
                                                        movieId={pick.MovieId}
                                                        title={pick.Title}
                                                        posterUrl={pick.PosterUrl}
                                                        boxOffice={pick.BoxOffice}
                                                        releaseDate={pick.ReleaseDate}
                                                        isBench={pick.IsStarting === false}
                                                    />
                                                ) : (
                                                    <MovieCard key={slot} title="Open Slot" isBench={slot > team.StartingNumber} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-neutral-900/50 rounded-3xl border-2 border-dashed border-neutral-800 p-20 text-center flex flex-col items-center">
                                <p className="text-neutral-500 mb-6 italic">No active leagues found.</p>
                                <div className='flex gap-4 md:flex-row flex-col items-center'>
                                    <Link href="/leagues" className="bg-red-600 text-white px-8 py-3 md:mb-0 mb-2 w-fit rounded-xl font-black uppercase italic hover:bg-red-700 transition-all">
                                        Find a League
                                    </Link>
                                    <Link href="/leagues/create" className="bg-red-600 text-white px-8 py-3 w-fit rounded-xl font-black uppercase italic hover:bg-red-700 transition-all">
                                        Create a League
                                    </Link>
                                </div>

                            </div>
                        )}
                    </section>
                </main>
                <Footer />
            </div>
        </SessionGuard>
    );
}