'use client';

import { useState, useEffect } from 'react';
import MovieHeader from '../components/MovieHeader';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfFyIGgGM1ijXqmsNF_QwTSfhsPtmAJZCJef1LhynJ7aamawhh0qpqY-9RpyH1W9bK/exec";
const TMDB_AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlMTdlOTMxYjY4MjM1NjBkNGNmMjc0YzhkZmZhMTc4YSIsIm5iZiI6MTc1MDE5MTEwOC40MjcsInN1YiI6IjY4NTFjYzA0YWViYTJkMmZlNGIzMTU0ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Q-mtZuNx4NSIMwB1aO6vwA3MmzkiBOTALyFBLg8cwsc';

interface PlayerRank {
    name: string;
    totalRevenue: number;
    releasedCount: number;
    topMovie: string;
}

export default function Leaderboard() {
    const [rankings, setRankings] = useState<PlayerRank[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Movie Boxing - Leaderboard";
    }, []);

    useEffect(() => {
        async function fetchAndRank() {
            try {
                const draftRes = await fetch(SCRIPT_URL);
                const draftData = await draftRes.json();

                const starterIds = Array.from(new Set(draftData.flatMap((p: any) => p.starting)));
                const options = { method: 'GET', headers: { accept: 'application/json', Authorization: TMDB_AUTH } };

                const detailPromises = starterIds.map(async (id: any) => {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}`, options);
                    return await res.json();
                });

                const movieResults = await Promise.all(detailPromises);
                const movieMap: any = {};
                movieResults.forEach(m => { if (m.id) movieMap[String(m.id)] = m; });

                const today = new Date();

                const calculatedRanks: PlayerRank[] = draftData.map((player: any) => {
                    const starters = player.starting.map((id: string) => movieMap[id]).filter(Boolean);

                    // Logic: Count movies where release_date <= today
                    const releasedMovies = starters.filter((m: any) => {
                        if (!m.release_date) return false;
                        return new Date(m.release_date) <= today;
                    });

                    const total = starters.reduce((sum: number, m: any) => sum + (m.revenue || 0), 0);

                    // Logic: Find the movie with the highest individual revenue
                    const topMovieObj = [...starters].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];

                    return {
                        name: player.name,
                        totalRevenue: total,
                        releasedCount: releasedMovies.length,
                        topMovie: topMovieObj?.title || 'None'
                    };
                });

                calculatedRanks.sort((a, b) => {
                    if (b.totalRevenue !== a.totalRevenue) {
                        return b.totalRevenue - a.totalRevenue;
                    }
                    return b.releasedCount - a.releasedCount;
                });
                setRankings(calculatedRanks);

            } catch (err) {
                console.error("Leaderboard Error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAndRank();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <MovieHeader />
            <div className="bg-black text-white flex items-center justify-center font-black italic tracking-widest animate-pulse">
                UPDATING LEADERBOARD...
            </div>
        </div>

    );

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <MovieHeader />

                <div className="space-y-6">
                    {rankings.map((player, index) => (
                        <div
                            key={player.name}
                            className={`relative group rounded-3xl border-2 transition-all duration-300 ${index === 0
                                ? 'bg-white text-black border-white scale-[1.02] shadow-[0_20px_50px_rgba(255,255,255,0.1)]'
                                : 'bg-neutral-900 text-white border-neutral-800'
                                }`}
                        >
                            <div className="p-6 md:p-8 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <span className={`text-5xl font-black italic leading-none ${index === 0 ? 'text-black/20' : 'text-neutral-800'}`}>
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-1">
                                            {player.name}
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${index === 0 ? 'bg-black text-white' : 'bg-blue-600 text-white'
                                                }`}>
                                                {player.releasedCount} / 5 RELEASED
                                            </span>
                                            <span className="text-[10px] font-bold uppercase opacity-50">
                                                MVP: {player.topMovie}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums">
                                        {(() => {
                                            const rev = player.totalRevenue || 0;
                                            if (rev >= 1000000000) {
                                                return `$${(rev / 1000000000).toFixed(2)}B`;
                                            }
                                            return `$${(rev / 1000000).toFixed(1)}M`;
                                        })()}
                                    </p>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${index === 0 ? 'text-black/60' : 'text-neutral-500'}`}>
                                        Total Box Office
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}