'use client';

import { use, useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import { Trophy, Film, Scale, Zap, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Profile({ params }: { params: Promise<{ id: string }> }) {
    const [loading, setLoading] = useState(true);
    const { id } = use(params);
    const { data: session, status: sessionStatus } = useSession();
    const [userInfo, setUserInfo] = useState<any>(null);
    const isOwner = session?.user?.name === id;
    const [stats, setStats] = useState<any[]>([]);

    // Placeholder data - replace with your fetch results later
    // const stats = [
    //     { label: "Total Earnings", value: "$1.4B", icon: <Zap size={20} className="text-yellow-400" /> },
    //     { label: "Leagues Won", value: "3", icon: <Trophy size={20} className="text-red-600" /> },
    //     { label: "Total Trades", value: "88", icon: <Scale size={20} className="text-blue-500" /> },
    //     { label: "Movies Picked", value: "42", icon: <Film size={20} className="text-purple-500" /> },
    // ];

    useEffect(() => {
        if (userInfo != null) {
            document.title = "Movie Boxing - " + userInfo.Username;
        }
    }, [userInfo]);

    useEffect(() => {
        document.title = "Movie Boxing - Profile";

        async function fetchData() {
            // Now it will wait until the status changes from 'loading' to 'authenticated'
            if (sessionStatus !== "authenticated") return;

            setLoading(true);
            try {
                // Use the 'id' you already extracted at the top of the component
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/stats?id=${id}`, {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setUserInfo(data);
                    setStats([
                        { label: "Total Earnings", value: `$${data.TotalEarnings.toLocaleString()}`, icon: <Zap size={20} className="text-yellow-400" /> },
                        { label: "Leagues Won", value: data.LeaguesWon, icon: <Trophy size={20} className="text-red-600" /> },
                        { label: "Total Trades", value: "xx", icon: <Scale size={20} className="text-blue-500" /> }, // Placeholder
                        { label: "Movies Picked", value: data.MovieCount, icon: <Film size={20} className="text-purple-500" /> },
                    ]);
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        // Add these to the dependency array!
    }, [sessionStatus, session?.accessToken, id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-black italic text-4xl animate-pulse text-red-600">
                LOADING PROFILE...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-white/10 pb-12">
                    <div>
                        <p className="text-red-600 font-black uppercase italic tracking-[0.3em] text-xs mb-2"></p>
                        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                            {userInfo?.DisplayName || "Unknown Fighter"}
                        </h1>
                        <p className='text-md font-black uppercase italic tracking-tighter leading-none mt-3'>
                            {userInfo?.Username ? `@${userInfo.Username}` : "No Handle"}
                        </p>
                    </div>
                    {session?.user.id != id && (
                        <button className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl h-full font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-2xl active:scale-95">
                            <UserPlus size={20} strokeWidth={3} />
                            Invite To League
                        </button>
                    )}
                </div>

                {/* STATS GRID */}
                <section className="mb-20">
                    <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-500 mb-8">Career Analytics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-[2rem] hover:border-red-600/50 transition-colors">
                                <div className="mb-4">{stat.icon}</div>
                                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black italic font-mono uppercase">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* LEAGUES SECTION */}
                <section>
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-500">Current Arenas</h2>
                        <span className="text-[10px] font-mono text-neutral-600 uppercase">3 Active Leagues</span>
                    </div>

                    <div className="space-y-4">
                        {/* Placeholder League Card */}
                        {[1, 2, 3].map((league) => (
                            <div key={league} className="group bg-neutral-900/30 border border-neutral-800/50 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center hover:bg-neutral-900/60 transition-all cursor-pointer">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-neutral-800 rounded-2xl flex items-center justify-center font-black text-2xl italic group-hover:text-red-600 transition-colors">
                                        L{league}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase italic tracking-tight">Summer Blockbuster {league}</h3>
                                        <p className="text-xs font-mono text-neutral-500 uppercase font-bold mt-1">Rank: #2 / 12 Players</p>
                                    </div>
                                </div>
                                <div className="mt-4 md:mt-0">
                                    <span className="text-neutral-500 font-black italic uppercase text-xs group-hover:text-white transition-colors">View Arena →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}