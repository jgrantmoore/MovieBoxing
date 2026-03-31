'use client';

import { useState, useEffect, useMemo } from 'react';

interface OwnedBy {
    TeamName: string;
    Owner: string;
}

interface MovieData {
    MovieId: number;
    Title: string;
    BoxOffice: number;
    PosterUrl: string;
    ReleaseDate: string; // "2026-02-11T00:00:00.000Z"
    OwnedBy: OwnedBy;
}

export interface ReleaseOrderProps {
    leagueId?: number;
}

const ReleaseOrder: React.FC<ReleaseOrderProps> = ({ leagueId }) => {
    const [loading, setLoading] = useState(true);
    const [movies, setMovies] = useState<MovieData[]>([]);

    useEffect(() => {
        async function fetchReleaseOrder() {
            if (!leagueId) return;
            setLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/release-order?id=${leagueId}`);
                if (res.ok) {
                    const data = await res.json();
                    setMovies(data);
                }
            } catch (error) {
                console.error("Error fetching release order:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchReleaseOrder();
    }, [leagueId]);

    const today = new Date();

    const formatCurrency = (rev: number) => {
        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)}B`;
        if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
        return `$${(rev / 1000).toFixed(0)}K`;
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20 font-black italic text-neutral-600 animate-pulse tracking-tighter uppercase">
            Syncing Release Slate...
        </div>
    );

    // Find the first movie that hasn't come out yet to anchor the "Jump to Today"
    const firstFutureIdx = movies.findIndex(m => new Date(m.ReleaseDate) > today);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                    Release Order
                </h2>
                <a 
                    href="#today" 
                    className="py-2 px-4 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black uppercase italic tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    Jump To Today
                </a>
            </div>

            <div className="relative border-l-2 border-neutral-900 ml-4 md:ml-6">
                {movies.map((movie, idx) => {
                    const releaseDate = new Date(movie.ReleaseDate);
                    const isReleased = releaseDate <= today;
                    const isTodayAnchor = idx === firstFutureIdx;

                    return (
                        <div 
                            key={movie.MovieId} 
                            className="mb-12 ml-8 relative scroll-mt-32" 
                            id={isTodayAnchor ? 'today' : undefined}
                        >
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[41px] md:-left-[43px] top-1 w-5 h-5 rounded-full border-4 border-black z-10 
                                ${isReleased ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-neutral-700'}`} 
                            />

                            <div className={`p-6 rounded-3xl border transition-all duration-300 
                                ${isReleased 
                                    ? 'bg-neutral-900/30 border-neutral-800/50 opacity-60 grayscale-[0.5]' 
                                    : 'bg-neutral-900/80 border-neutral-700 shadow-2xl shadow-black'}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        {/* Small Poster Preview */}
                                        <div className="w-16 h-24 bg-neutral-950 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800">
                                            <img 
                                                src={`https://image.tmdb.org/t/p/w200${movie.PosterUrl}`} 
                                                alt={movie.Title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div>
                                            <p className={`font-black text-[10px] tracking-widest uppercase mb-1 ${isReleased ? 'text-green-500' : 'text-blue-500'}`}>
                                                {releaseDate.toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    timeZone: 'UTC'
                                                })}
                                            </p>
                                            <h3 className="text-xl font-black uppercase italic tracking-tight text-white leading-none mb-3">
                                                {movie.Title}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black bg-white text-black px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                                    {movie.OwnedBy.Owner}
                                                </span>
                                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                                                    {movie.OwnedBy.TeamName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:text-right md:border-l md:border-neutral-800 md:pl-8 flex flex-col justify-center">
                                        <p className={`text-2xl font-mono font-black tracking-tighter ${isReleased ? 'text-white' : 'text-neutral-600'}`}>
                                            {formatCurrency(movie.BoxOffice)}
                                        </p>
                                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                                            Cumulative Total
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReleaseOrder;