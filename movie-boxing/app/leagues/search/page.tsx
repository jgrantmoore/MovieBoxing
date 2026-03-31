'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Search, Users, Trophy, ArrowRight, Lock, LockOpen } from 'lucide-react';

export default function LeagueSearch() {
    const [query, setQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/search?q=${query}`);
            if (res.ok) {
                const data = await res.json();
                setLeagues(data);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // Optional: Auto-search as the user types (with debounce)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.length > 2) handleSearch();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
                {/* Header */}
                <header className="text-center mb-16">
                    <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
                        Find Your <span className="text-red-600">Arena</span>
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
                        Search for open leagues or join a private one
                    </p>
                </header>

                {/* Search Bar Section */}
                <div className="max-w-2xl mx-auto mb-20">
                    <form onSubmit={handleSearch} className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="text-neutral-500 group-focus-within:text-red-600 transition-colors" size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by league name..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-14 pr-6 text-xl focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all placeholder:text-neutral-700 font-bold uppercase italic tracking-tight"
                        />
                        {loading && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </form>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {leagues.length > 0 ? (
                        leagues.map((league) => (
                            <div 
                                key={league.LeagueId}
                                className="group bg-neutral-900/40 border border-neutral-800 p-8 rounded-[2rem] hover:border-red-600/50 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between flex-col items-start mb-3 gap-1">
                                        <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none group-hover:text-red-600 transition-colors">
                                            {league.LeagueName}
                                        </h3>
                                    </div>
                                    
                                    <div className="flex gap-6 mb-8 text-neutral-400 font-mono text-xs uppercase">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-red-600" />
                                            <span>{league.TeamCount} Team{league.TeamCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Trophy size={14} className="text-red-600" />
                                            <span>{league.StartingNumber} Starters</span>
                                        </div>
                                        {league.isPrivate ? (
                                            <div className="flex items-center gap-2">
                                                <Lock size={14} className="text-red-600" />
                                                <span>Private League</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <LockOpen size={14} className="text-green-500" />
                                                <span>Public League</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => router.push(`/leagues/${league.LeagueId}`)}
                                    className="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all uppercase italic tracking-tighter"
                                >
                                    View League <ArrowRight size={18} strokeWidth={3} />
                                </button>
                            </div>
                        ))
                    ) : query.length > 2 && !loading ? (
                        <div className="col-span-full py-20 text-center bg-neutral-900/20 border-2 border-dashed border-neutral-900 rounded-[2rem]">
                            <p className="text-neutral-500 font-bold uppercase italic tracking-widest">
                                No leagues found matching "{query}"
                            </p>
                        </div>
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-neutral-700 font-black text-6xl md:text-8xl uppercase italic tracking-tighter opacity-20 select-none">
                                Ready to Fight?
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}