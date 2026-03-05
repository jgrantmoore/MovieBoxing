'use client';

import { useState, useEffect, useMemo } from 'react';
import MovieHeader from '../components/MovieHeader';
import { get } from 'http';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfFyIGgGM1ijXqmsNF_QwTSfhsPtmAJZCJef1LhynJ7aamawhh0qpqY-9RpyH1W9bK/exec";
const TMDB_AUTH = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlMTdlOTMxYjY4MjM1NjBkNGNmMjc0YzhkZmZhMTc4YSIsIm5iZiI6MTc1MDE5MTEwOC40MjcsInN1YiI6IjY4NTFjYzA0YWViYTJkMmZlNGIzMTU0ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Q-mtZuNx4NSIMwB1aO6vwA3MmzkiBOTALyFBLg8cwsc';

interface ScheduledMovie {
    id: string;
    title: string;
    usReleaseDate: string;
    internationalReleaseDate: string;
    owner: string;
    revenue: number;
    isBench: boolean;
}

export default function ReleaseOrder() {
    const [schedule, setSchedule] = useState<ScheduledMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'us' | 'intl'>('intl');

    useEffect(() => {
        document.title = "Movie Boxing - Release Order";
    }, []);

    useEffect(() => {
        async function fetchSchedule() {
            try {
                const draftRes = await fetch(SCRIPT_URL);
                const draftData = await draftRes.json();

                // 1. Collect all unique IDs
                const allIds = Array.from(new Set(draftData.flatMap((p: any) => [...p.starting, ...p.bench])));

                // 2. Fetch TMDB Details
                const options = { method: 'GET', headers: { accept: 'application/json', Authorization: TMDB_AUTH } };
                const detailPromises = allIds.map(async (id: any) => {
                    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?append_to_response=release_dates&language=en-US`, options);
                    return await res.json();
                });

                const movieResults = await Promise.all(detailPromises);
                const movieMap: any = {};
                movieResults.forEach(m => { if (m.id) movieMap[String(m.id)] = m; });

                // Helper to find the best US date
                const getUSReleaseDate = (m: any) => {
                    const usData = m?.release_dates?.results.find((c: any) => c.iso_3166_1 === "US");
                    if (!usData) return m?.release_date || '9999-12-31';

                    // Look for Type 3 (Theatrical). If not found, take the first available.
                    const theatrical = usData.release_dates.find((rd: { type: number; release_date: string }) => rd.type === 3);
                    return theatrical ? theatrical.release_date : usData.release_dates[0].release_date;
                };

                // 3. Flatten draft into a list of movies with owners
                const flattened: ScheduledMovie[] = [];
                draftData.forEach((player: any) => {
                    player.starting.forEach((id: string) => {
                        const m = movieMap[id];
                        flattened.push({
                            id,
                            title: m?.title || 'Unknown',
                            usReleaseDate: getUSReleaseDate(m),
                            internationalReleaseDate: m?.release_date || '9999-12-31',
                            owner: player.name,
                            revenue: m?.revenue || 0,
                            isBench: false
                        });
                    });
                    player.bench.forEach((id: string) => {
                        const m = movieMap[id];
                        flattened.push({
                            id,
                            title: m?.title || 'Unknown',
                            usReleaseDate: getUSReleaseDate(m),
                            internationalReleaseDate: m?.release_date || '9999-12-31',
                            owner: player.name,
                            revenue: m?.revenue || 0,
                            isBench: true
                        });
                    });
                });

                // 4. Sort by date
                flattened.sort((a, b) => new Date(a.usReleaseDate).getTime() - new Date(b.usReleaseDate).getTime());
                setSchedule(flattened);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchSchedule();
    }, []);

    const formatCurrency = (rev: number) => {
        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)}B`;
        return `$${(rev / 1000000).toFixed(1)}M`;
    };


    const today = new Date().toISOString().split('T')[0];

    const sortedSchedule = useMemo(() => {
        const arr = [...schedule];
        if (sortBy === 'us') {
            arr.sort((a, b) => new Date(a.usReleaseDate).getTime() - new Date(b.usReleaseDate).getTime());
        } else {
            arr.sort((a, b) => new Date(a.internationalReleaseDate).getTime() - new Date(b.internationalReleaseDate).getTime());
        }
        return arr;
    }, [schedule, sortBy]);

    if (loading) return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <MovieHeader />
            <div className="bg-black text-white flex items-center justify-center font-black italic animate-pulse">LOADING CALENDAR...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <MovieHeader />
                <div className="flex items-center justify-left mb-4">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'us' | 'intl')}
                        className="ml-1 w-20p p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-black uppercase italic tracking-tight"
                    >
                        <option value="us">Sort by US Release</option>
                        <option value="intl">Sort by Intl Release</option>
                    </select>
                    <a href="#today" className="ml-3 w-50p py-2 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-black uppercase italic tracking-tight">
                        Jump To Today
                    </a>
                </div>

                <div className="relative border-l-2 border-neutral-900 ml-3md:ml-12 md:ml-0">
                    {(() => {
                        const firstFutureMovieIndex = sortedSchedule.findIndex(movie => {
                            const isReleased = movie.usReleaseDate <= today || movie.internationalReleaseDate <= today;
                            return !isReleased;
                        });
                        return sortedSchedule.map((movie, idx) => {
                            const isReleased = movie.usReleaseDate <= today || movie.internationalReleaseDate <= today;

                            return (
                                <div key={`${movie.id}-${idx}`} className="mb-10 ml-8 relative scroll-mt-60" id={idx === firstFutureMovieIndex ? 'today' : undefined}>
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-black transition-colors ${isReleased ? 'bg-green-500' : 'bg-blue-600'}`} />

                                    <div className={`p-5 rounded-2xl border transition-all ${isReleased ? 'bg-neutral-900/40 border-neutral-800 opacity-60' : 'bg-neutral-900 border-neutral-700 shadow-xl'}`}>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className='flex flex-row'>
                                                    <p className="text-blue-500 font-black text-[10px] tracking-widest uppercase mb-1 mr-2">
                                                        INTL: {(() => {
                                                            const d = new Date(movie.internationalReleaseDate);
                                                            return d.toLocaleDateString('en-US', {
                                                                month: 'long',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                timeZone: 'UTC' // <--- This forces the browser to ignore your local time
                                                            });
                                                        })()}
                                                    </p>
                                                    <p className="text-gray-400 font-black text-[10px] tracking-widest uppercase mb-1">
                                                        US: {(() => {
                                                            const d = new Date(movie.usReleaseDate);
                                                            return d.toLocaleDateString('en-US', {
                                                                month: 'long',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                timeZone: 'UTC' // <--- This forces the browser to ignore your local time
                                                            });
                                                        })()}
                                                    </p>
                                                </div>
                                                <h2 className="text-xl font-black uppercase italic tracking-tight">{movie.title}</h2>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] font-bold bg-white text-black px-2 py-0.5 rounded uppercase">
                                                        {movie.owner}
                                                    </span>
                                                    {movie.isBench && (
                                                        <span className="text-[10px] font-bold border border-neutral-700 text-neutral-500 px-2 py-0.5 rounded uppercase">
                                                            Bench
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right md:border-l md:border-neutral-800 md:pl-8">
                                                <p className="text-2xl font-mono font-bold tracking-tighter">
                                                    {formatCurrency(movie.revenue)}
                                                </p>
                                                <p className="text-[9px] font-bold text-neutral-500 uppercase">Revenue Collected</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
}