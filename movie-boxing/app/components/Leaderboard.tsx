'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
    TeamId: number;
    TeamName: string;
    OwnerName: string;
    TotalRevenue: number;
    ReleasedCount: number;
    TopMovie: string;
}

export default function Leaderboard({ leagueId }: { leagueId: number }) {
    const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/leaderboard?id=${leagueId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRankings(data);
                }
            } catch (err) {
                console.error("Leaderboard Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, [leagueId]);

    const formatCurrency = (rev: number) => {
        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)}B`;
        if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
        return `$${(rev / 1000).toFixed(0)}K`;
    };

    if (loading) return (
        <div className="py-20 flex items-center justify-center font-black italic text-neutral-600 animate-pulse uppercase tracking-widest">
            Calculating Standings...
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="space-y-4">
                {rankings.map((player, index) => {
                    const isFirst = index === 0;
                    return (
                        <div
                            key={player.TeamId}
                            className={`relative overflow-hidden rounded-3xl border-2 transition-all duration-500 
                                ${isFirst 
                                    ? 'bg-white text-black border-white scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.15)]' 
                                    : 'bg-neutral-900 text-white border-neutral-800 hover:border-neutral-600'
                                }`}
                        >
                            <div className="p-6 md:p-8 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-6">
                                    {/* Rank Number */}
                                    <span className={`text-4xl md:text-6xl font-black italic leading-none select-none
                                        ${isFirst ? 'text-black/10' : 'text-neutral-800'}`}>
                                        {index + 1}
                                    </span>
                                    
                                    <div>
                                        <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter leading-tight">
                                            {player.TeamName}
                                        </h2>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isFirst ? 'text-black/50' : 'text-neutral-500'}`}>
                                            Manager: {player.OwnerName}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] uppercase 
                                                ${isFirst ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}>
                                                {player.ReleasedCount == 1 ? '1 Movie Active' : `${player.ReleasedCount} Movies Active`}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isFirst ? 'text-black/40' : 'text-neutral-500'}`}>
                                                MVP: {player.TopMovie}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-3xl md:text-5xl font-black tracking-tighter tabular-nums leading-none">
                                        {formatCurrency(player.TotalRevenue)}
                                    </p>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-2 
                                        ${isFirst ? 'text-black/40' : 'text-neutral-500'}`}>
                                        Total Box Office
                                    </p>
                                </div>
                            </div>
                            
                            {/* Decorative background Rank for the Champ */}
                            {isFirst && (
                                <div className="absolute -right-4 -bottom-8 text-[120px] font-black italic text-black/5 pointer-events-none">
                                    01
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}