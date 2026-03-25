'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import MovieCard from "../../../components/MovieCard";
import Footer from "../../../components/Footer";
import { useSession } from 'next-auth/react';
import { Lock, X, Trophy, Calendar, Armchair, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LeagueDetails({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status: sessionStatus } = useSession();
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const [activeEditTeamId, setActiveEditTeamId] = useState<number>(0);
    const router = useRouter();

    const currentUserTeam = teams.find(t => t.OwnerUserId === session?.user?.id);
    const userTeamId = currentUserTeam?.TeamId || 0;
    const userTeamName = currentUserTeam?.TeamName || "";


    // Modal & Join States
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
    const [leaguePassword, setLeaguePassword] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [leagueStatus, setLeagueStatus] = useState("Loading...");

    const isReallyLoading = loading || sessionStatus === "loading";

    // Stay in the loading state until we have actual league data
    const isDataReady = leagueInfo !== null && teams.length >= 0;
    const showLoading = isReallyLoading || !isDataReady;

    useEffect(() => {
        document.title = leagueInfo?.LeagueName != null ? "Movie Boxing - " + leagueInfo.LeagueName : "Movie Boxing - League Info";
    }, [leagueInfo]);

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
                    if (data.StartDate && today < new Date(data.StartDate)) {
                        setLeagueStatus("Planning Stage");
                    } else if (data.EndDate && today > new Date(data.EndDate)) {
                        setLeagueStatus("Finished");
                    } else {
                        setLeagueStatus("In Progress");
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [sessionStatus, session?.accessToken, params]);


    // This ensures that every time leagueInfo updates, these numbers update too.
    const STARTING_SLOTS = leagueInfo?.Rules?.Starting || 5;
    const BENCH_SLOTS = leagueInfo?.Rules?.Bench || 3;
    const TOTAL_SLOTS = STARTING_SLOTS + BENCH_SLOTS;

    if (showLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-6xl font-black italic text-red-600 uppercase animate-pulse tracking-tighter">
                        Loading League...
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="bg-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{leagueStatus}</span>
                            <span className="text-neutral-500 font-mono text-xs uppercase">{leagueInfo?.Teams?.length || 0} Participants</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none break-words">
                            {leagueInfo?.LeagueName}
                        </h1>
                        {sessionStatus === "authenticated" && leagueInfo.isAdmin && (
                            <button
                                onClick={() => setAdminSettingsOpen(!adminSettingsOpen)}
                                className="text-md bg-white text-black px-5 py-2 rounded-2xl mt-3 font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                            >
                                {adminSettingsOpen ? 'Hide Admin Settings' : 'Show Admin Settings'}
                            </button>
                        )}
                    </div>

                    {sessionStatus === "authenticated" && !leagueInfo.Joined && (
                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                        >
                            Join League
                        </button>
                    )}
                </div>

                {/* Rules Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 bg-neutral-900/30 p-6 rounded-3xl border border-neutral-800/50">
                    <div className="flex items-center gap-3">
                        <Trophy className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Starters</p>
                            <p className="font-black italic">{leagueInfo?.Rules.Starting} Slots</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Armchair className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Bench</p>
                            <p className="font-black italic">{leagueInfo?.Rules.Bench} Slots</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">League Starts</p>
                            <p className="font-black italic">{leagueInfo?.EndDate ? new Date(leagueInfo.StartDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">League Ends</p>
                            <p className="font-black italic">{leagueInfo?.EndDate ? new Date(leagueInfo.EndDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">League Type</p>
                            <p className="font-black italic">{leagueInfo?.isPrivate ? 'Private' : 'Public'}</p>
                        </div>
                    </div>
                    {/* ADMIN SETTINGS */}
                    {leagueInfo.isAdmin && adminSettingsOpen && (
                        <div className="flex items-center gap-3">
                            <Trash2 className="text-red-600" size={20} />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-neutral-500">Delete League</p>
                                <button
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="text-xs bg-white text-black px-3 py-1 rounded-xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                >
                                    Delete League
                                </button>
                            </div>
                        </div>

                    )}
                </div>

                {/* Rosters Section */}
                <div className="space-y-12">
                    {teams.map((team) => {
                        const totalBoxOffice = (team.Picks || []).reduce((sum: number, pick: any) => {
                            return (pick.OrderDrafted <= STARTING_SLOTS) ? sum + (pick.BoxOffice || 0) : sum;
                        }, 0);

                        return (
                            <div key={team.TeamId} className="bg-neutral-900/40 rounded-[2.5rem] border border-neutral-800 p-8 shadow-2xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-neutral-800 pb-8">
                                    <div>
                                        <h2 className="text-4xl font-black uppercase italic text-red-600 tracking-tighter break-all">{team.TeamName}</h2>
                                        <div className='flex flex-row items-center gap-2'>
                                            <Link href={"/profile/" + team.OwnerUserId} className="text-md text-neutral-500 font-mono font-bold mt-1">Manager: {team.Owner}</Link>

                                            {team.OwnerUserId == session?.user?.id && (
                                                <button
                                                    className="text-xs bg-white text-black px-3 py-1 rounded-xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                                    onClick={() => {
                                                        setActiveEditTeamId(team.TeamId);
                                                        setNewTeamName(team.TeamName);
                                                        setIsEditTeamModalOpen(true);
                                                    }}
                                                >
                                                    Edit Team?
                                                </button>
                                            )}

                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Current Score</p>
                                            <p className="text-3xl font-mono font-black">${(totalBoxOffice / 1000000).toFixed(1)}M</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const next = new Set(openBench);
                                                next.has(team.TeamName) ? next.delete(team.TeamName) : next.add(team.TeamName);
                                                setOpenBench(next);
                                            }}
                                            className="bg-neutral-800 px-4 py-2 rounded-xl text-xs font-bold uppercase"
                                        >
                                            {openBench.has(team.TeamName) ? 'Hide Bench' : 'Show Bench'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {Array.from({ length: openBench.has(team.TeamName) ? TOTAL_SLOTS : STARTING_SLOTS }).map((_, idx) => {
                                        const slot = idx + 1;
                                        const pick = team.Picks?.find((p: any) => p.OrderDrafted === slot);
                                        return (
                                            <MovieCard
                                                key={slot}
                                                {...pick}
                                                title={pick?.Title || "Open Slot"}
                                                movieId={pick?.MovieId || 0}
                                                isBench={slot > STARTING_SLOTS}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <Footer />
        </div>
    );
}