'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import Navbar from "../../components/Navbar";
import MovieCard from "../../components/MovieCard";
import Footer from "../../components/Footer";
import ReleaseOrder from "../../components/ReleaseOrder";
import Leaderboard from "../../components/Leaderboard";
import { useSession } from 'next-auth/react';
import { Lock, X, Trophy, Calendar, Armchair, Trash2, Settings, UserStar, Users, UserMinus, Pencil, Search, LayoutGrid, ListOrdered, Medal, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

export default function LeagueDetails({ params }: { params: Promise<{ id: string }> }) {
    const { data: session, status: sessionStatus } = useSession();
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const [activeEditTeamId, setActiveEditTeamId] = useState<number>(0);
    const [swapSelection, setSwapSelection] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'teams' | 'release' | 'leaderboard'>('teams');
    const router = useRouter();

    const currentUserTeam = useMemo(() => {
        if (!teams || !session?.user?.id) return null;
        return teams.find(t => String(t.OwnerUserId) === String(session.user.id));
    }, [teams, session]);

    // 2. Identify WHICH team is actually being edited in the modal
    // (Defaults to current user, but switches if an Admin clicks another team)
    const teamBeingEdited = useMemo(() => {
        const targetId = activeEditTeamId !== 0 ? activeEditTeamId : currentUserTeam?.TeamId;
        return teams.find(t => t.TeamId === targetId);
    }, [teams, activeEditTeamId, currentUserTeam]);

    const userTeamId = currentUserTeam?.TeamId || 0;
    const userTeamName = teamBeingEdited?.TeamName || "";

    // Admin Manual Edit States
    const [isAdminEditModalOpen, setIsAdminEditModalOpen] = useState(false);
    const [selectedAdminTeam, setSelectedAdminTeam] = useState<any>(null);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [adminSearchTerm, setAdminSearchTerm] = useState("");
    const [adminSearchResults, setAdminSearchResults] = useState([]);
    const [isSearchingAdmin, setIsSearchingAdmin] = useState(false);

    const debouncedAdminSearch = useDebounce(adminSearchTerm, 500);



    // Modal & Join States
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUpdateLeagueModalOpen, setIsUpdateLeageModalOpen] = useState(false);
    const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
    const [leaguePassword, setLeaguePassword] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newLeaguePassword, setNewLeaguePassword] = useState('');
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

    // Debounce the main search term for the Front Office modal
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch) {
                setAdminSearchResults([]); // Reusing this state for the results
                return;
            }
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
                setAdminSearchResults(data);
            } catch (err) {
                console.error("Search error:", err);
            }
        };
        performSearch();
    }, [debouncedSearch, leagueInfo]);

    // for admin search bar
    useEffect(() => {
        const performAdminSearch = async () => {
            if (!debouncedAdminSearch) {
                setAdminSearchResults([]);
                return;
            }
            setIsSearchingAdmin(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies/search?q=${debouncedAdminSearch}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        StartDate: leagueInfo.StartDate,
                        EndDate: leagueInfo.EndDate
                    })
                });
                const data = await res.json();
                setAdminSearchResults(data);
            } catch (err) {
                console.error("Admin Search error:", err);
            } finally {
                setIsSearchingAdmin(false);
            }
        };
        performAdminSearch();
    }, [debouncedAdminSearch, leagueInfo]);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            try {
                const { id } = await params;
                let res;
                if (session == null) {
                    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}`);
                } else {
                    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}`, {
                        headers: { 'Authorization': `Bearer ${session.accessToken}` }
                    });
                }
                if (res.ok) {
                    const data = await res.json();
                    setTeams(data.Teams || []);
                    setLeagueInfo(data);
                    const today = new Date();
                    if (data.StartDate && today < new Date(data.StartDate) && !data.HasDrafted) {
                        setLeagueStatus("Planning Stage");
                    } else if (data.EndDate && today > new Date(data.EndDate) && data.HasDrafted) {
                        setLeagueStatus("Finished");
                    } else if (data.HasDrafted) {
                        setLeagueStatus("League Started");
                    } else if (data.IsDrafting) {
                        setLeagueStatus("Draft in Progress");
                    } else {
                        setLeagueStatus("Waiting for Draft to Occur");
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

    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            const { id } = await params;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamName: `${session?.user?.name}'s Team`,
                    LeagueId: id,
                    LeaguePassword: leaguePassword == '' ? null : leaguePassword // Send null if password is empty
                })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Welcome to the Arena! Refreshing rosters..." });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const errorData = await res.json();
                setStatusMessage({ type: 'error', text: errorData.message || "Failed to join." });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeleting(true);
        setStatusMessage(null);

        try {
            const { id } = await params;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/update?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    LeagueId: id,
                    JoinPassword: newLeaguePassword == '' ? null : newLeaguePassword // Send null if password is empty
                })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Successfully deleted the league..." });
                router.push('/dashboard');
            } else {
                const errorData = await res.json();
                setStatusMessage({ type: 'error', text: errorData.message || "Failed to delete." });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeleting(true);
        setStatusMessage(null);

        try {
            const { id } = await params;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/delete?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                }
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Successfully deleted the league..." });
                router.push('/dashboard');
            } else {
                const errorData = await res.json();
                setStatusMessage({ type: 'error', text: errorData.message || "Failed to delete." });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeEditTeamId === 0) {
            setStatusMessage({ type: 'error', text: "Team ID not found. Try refreshing." });
            return;
        }

        setIsSubmitting(true); // Using isSubmitting consistently
        setStatusMessage(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/update?id=${activeEditTeamId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({ TeamName: newTeamName })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Roster renamed! Getting back in the ring..." });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const errorData = await res.json();
                setStatusMessage({ type: 'error', text: errorData.message || "Failed to update." });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSwapMovies = async (slot1: number, slot2: number) => {
        setIsSubmitting(true);
        setStatusMessage(null); // Clear previous errors

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamId: activeEditTeamId || userTeamId, // Ensure we have an ID
                    Slot1: slot1,
                    Slot2: slot2
                })
            });

            // 1. Check if the response is successful
            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Roster reshuffled!" });
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            // 2. Handle Errors (400, 500, etc.)
            // First, check the content type to see if we should parse as JSON or Text
            const contentType = res.headers.get("content-type");
            let errorMessage = "An unexpected error occurred.";

            if (contentType && contentType.includes("application/json")) {
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
            } else {
                // This catches the plain string from your 'body: "Illegal Move..."'
                errorMessage = await res.text();
            }

            setStatusMessage({ type: 'error', text: errorMessage });

        } catch (error) {
            console.error("Swap Network Error:", error);
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsSubmitting(false);
            setSwapSelection(null); // Reset selection regardless of success/fail
        }
    };

    const handleDeleteTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeleting(true);
        setStatusMessage(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/delete?id=${activeEditTeamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`
                }
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Roster vacated. Exiting the arena..." });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const errorData = await res.json();
                setStatusMessage({ type: 'error', text: errorData.message || "Failed to delete team." });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: "Network error. The ref stopped the fight." });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAdminManualAssign = async (movie: any) => {
        if (!selectedAdminTeam || !selectedSlot) {
            alert("Please select a team and a slot first!");
            return;
        }

        if (!confirm(`Manually add "${movie.title}" to ${selectedAdminTeam.TeamName}'s Slot ${selectedSlot}?`)) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/assign-movie`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamId: selectedAdminTeam.TeamId,
                    TMDBId: movie.id,
                    SlotNumber: selectedSlot,
                })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Roster override successful!" });

                // Fetch the updated team data (or just update Picks in state)
                const teamRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/my-teams?id=${selectedAdminTeam.TeamId}`, {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                });
                if (teamRes.ok) {
                    const updatedTeam = await teamRes.json();
                    setSelectedAdminTeam((prev: any) => ({
                        ...prev,
                        Picks: updatedTeam.Picks
                    }));
                }
            }
        } catch (err) {
            console.error("Manual assign failed", err);
        }
    };

    const handleReplaceWithFreeAgent = async (newMovie: any) => {
        if (!swapSelection || !teamBeingEdited) {
            setStatusMessage({ type: 'error', text: "Select a roster slot first!" });
            return;
        }

        const slotToReplace = swapSelection;
        const oldPick = teamBeingEdited.Picks?.find((p: any) => p.OrderDrafted === slotToReplace);

        // Prompt for confirmation using the title from the TMDB search result
        if (!confirm(`Sign ${newMovie.title} to Slot ${slotToReplace}?${oldPick ? ` (This will release ${oldPick.MovieTitle})` : ''}`)) return;

        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/replace`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamId: teamBeingEdited.TeamId,
                    TMDBId: newMovie.id, // Only passing the external ID
                    Slot: slotToReplace
                })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Transaction processed! Roster updated." });
                setSwapSelection(null);
                setSearchTerm("");
                // Reload to get fresh data from the DB
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const errText = await res.text();
                setStatusMessage({ type: 'error', text: errText || "Transaction declined by the league." });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: "Network error. The trade window timed out." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminClearSlot = async () => {
        if (!selectedAdminTeam || !selectedSlot) return;

        const movieInSlot = selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot);
        if (!movieInSlot) return;

        if (!confirm(`ADMIN OVERRIDE: Permanently remove "${movieInSlot.MovieTitle}" from ${selectedAdminTeam.TeamName}?`)) return;

        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/clear-slot`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.accessToken}`
                },
                body: JSON.stringify({
                    TeamId: selectedAdminTeam.TeamId,
                    OrderDrafted: selectedSlot,
                    LeagueId: leagueInfo.LeagueId
                })
            });

            if (res.ok) {
                setStatusMessage({ type: 'success', text: "Slot cleared successfully!" });

                // Re-fetch the team data to update the UI without a full reload
                const teamRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/my-teams?id=${selectedAdminTeam.TeamId}`, {
                    headers: { 'Authorization': `Bearer ${session?.accessToken}` }
                });

                if (teamRes.ok) {
                    const updatedTeam = await teamRes.json();
                    setSelectedAdminTeam(updatedTeam);
                    // Also update the main teams list so the background UI stays in sync
                    setTeams(prev => prev.map(t => t.TeamId === updatedTeam.TeamId ? updatedTeam : t));
                }
            } else {
                const err = await res.text();
                setStatusMessage({ type: 'error', text: err || "Failed to clear slot." });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: "Network error occurred." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // This ensures that every time leagueInfo updates, these numbers update too.
    const STARTING_SLOTS = leagueInfo?.Rules?.Starting || 5;
    const BENCH_SLOTS = leagueInfo?.Rules?.Bench || 3;
    const TOTAL_SLOTS = STARTING_SLOTS + BENCH_SLOTS;

    const formatCurrency = (amount: number) => {
        if (amount <= 999999999) {
            return `$${(amount / 1000000).toFixed(2)}M`;
        } else if (amount >= 999999999) {
            return `$${(amount / 1000000000).toFixed(3)}B`;
        } else {
            return `$${(amount / 1000).toFixed(3)}K`;
        }
    };

    if (showLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-6xl font-black italic text-red-600 uppercase animate-pulse tracking-tighter text-center">
                        Loading League...
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />

            {/* JOIN MODAL */}
            {isJoinModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white">
                            <X size={24} />
                        </button>

                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Join the League</h2>
                        {leagueInfo?.isPrivate && (
                            <p className="text-neutral-500 text-sm mb-6">Enter the secret code to enter this arena.</p>
                        )}

                        <form onSubmit={handleJoinSubmit} className="space-y-4">
                            {leagueInfo?.isPrivate && (
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                                    <input
                                        type="password"
                                        placeholder="LEAGUE PASSWORD"
                                        className="w-full bg-black border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:border-red-600 outline-none transition-all font-mono"
                                        value={leaguePassword}
                                        onChange={(e) => setLeaguePassword(e.target.value)}
                                        required
                                    />
                                </div>
                            )}


                            {statusMessage && (
                                <p className={`text-xs font-bold uppercase tracking-widest ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                    {statusMessage.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={leagueInfo?.isPrivate ? "w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all" : "w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 py-4 mt-4 rounded-2xl font-black uppercase italic tracking-widest transition-all"}
                            >
                                {isSubmitting ? "PROCESSING..." : "CONFIRM ENTRY"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white">
                            <X size={24} />
                        </button>

                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Delete this League?</h2>
                        <p className="text-md mb-2">This will delete all league data and cannot be undone.</p>

                        <form onSubmit={handleDeleteLeague} className="space-y-4">


                            {statusMessage && (
                                <p className={`text-xs font-bold uppercase tracking-widest ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                    {statusMessage.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isDeleting}
                                className={"w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 py-4 mt-4 rounded-2xl font-black uppercase italic tracking-widest transition-all"}
                            >
                                {isDeleting ? "PROCESSING..." : "CONFIRM DELETION"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT TEAM MODAL (FRONT OFFICE) */}
            {isEditTeamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-y-auto max-h-[95vh] custom-scrollbar">

                        {/* Header Area */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Front Office</h2>
                                <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">
                                    Managing: <span className="text-white">{userTeamName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsEditTeamModalOpen(false);
                                    setSwapSelection(null);
                                    setSearchTerm("");
                                }}
                                className="text-neutral-500 hover:text-white p-2"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Main Content Grid: Stacks on mobile, Side-by-side on LG screens */}
                        <div className="flex flex-col lg:flex-row gap-8">

                            {/* LEFT: ROSTER (The "Classic" Grid) */}
                            <div className="flex-1 space-y-6 min-w-0">
                                <div className="bg-neutral-950 rounded-3xl border border-neutral-800 p-5">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4">Active Roster</h3>

                                    {/* Use responsive grid: 2 cols on tiny phones, 4 on everything else */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {Array.from({ length: TOTAL_SLOTS }).map((_, idx) => {
                                            const slot = idx + 1;
                                            const pick = teamBeingEdited?.Picks?.find((p: any) => p.OrderDrafted === slot);
                                            const isSelected = swapSelection === slot;

                                            return (
                                                <div
                                                    key={slot}
                                                    className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-red-600 rounded-xl scale-95' : 'opacity-80 hover:opacity-100'}`}
                                                    onClick={() => {
                                                        if (swapSelection === null) setSwapSelection(slot);
                                                        else if (swapSelection === slot) setSwapSelection(null);
                                                        else handleSwapMovies(swapSelection, slot);
                                                    }}
                                                >
                                                    {/* Scale down the MovieCard so it fits 4-wide without overflowing */}
                                                    <div className="scale-[0.85] sm:scale-100 origin-top">
                                                        <MovieCard
                                                            movieId={pick?.MovieId || 0}
                                                            title={pick?.MovieTitle || "Open"}
                                                            posterUrl={pick?.PosterUrl}
                                                            boxOffice={pick?.BoxOffice || 0}
                                                            releaseDate={pick?.InternationalReleaseDate}
                                                            isBench={slot > STARTING_SLOTS}
                                                        />
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center rounded-xl pointer-events-none">
                                                            <div className="bg-red-600 text-[8px] font-black px-2 py-1 rounded uppercase italic shadow-lg">Selected</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="relative group">
                                    <Pencil className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                                    <input
                                        type="text"
                                        placeholder="NEW TEAM NAME"
                                        className="w-full bg-black border border-neutral-800 rounded-xl py-4 pl-12 pr-4 focus:border-red-600 outline-none transition-all font-black italic uppercase text-lg"
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* RIGHT: SEARCH (Vertical List) */}
                            <div className="lg:w-[350px] space-y-4">
                                <div className="bg-black/40 rounded-3xl border border-slate-800 p-5 flex flex-col h-full max-h-[500px]">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 flex items-center gap-2">
                                        <Search size={14} /> Scout Free Agents
                                    </h3>

                                    <div className="relative mb-4">
                                        <input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={swapSelection ? "Search to replace slot..." : "Select a slot first..."}
                                            disabled={!swapSelection} // Optional: force them to pick a slot first
                                            className={`w-full bg-neutral-900 border ${swapSelection ? 'border-neutral-800' : 'border-red-900/30'} rounded-xl py-3 px-4 focus:border-red-600 outline-none text-[10px] font-bold uppercase italic transition-all`}
                                        />
                                        {!swapSelection && (
                                            <p className="text-[8px] text-red-500 font-bold uppercase mt-2 animate-pulse">
                                                Pick a movie from your roster to swap
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {adminSearchResults.length > 0 ? (
                                            adminSearchResults.map((movie: any) => {
                                                // Check if movie is already taken in this league
                                                const isOwned = teams.some(t => t.Picks?.some((p: any) => p.MovieId === movie.id));

                                                return (
                                                    <div
                                                        key={movie.id}
                                                        onClick={() => {
                                                            if (!isOwned && swapSelection) {
                                                                handleReplaceWithFreeAgent(movie);
                                                            }
                                                        }}
                                                        className={`p-2 rounded-xl border flex items-center justify-between transition-all 
                                ${isOwned
                                                                ? 'bg-neutral-900/10 border-transparent grayscale opacity-20 cursor-not-allowed'
                                                                : swapSelection
                                                                    ? 'bg-neutral-800/60 border-neutral-700 hover:border-green-500 cursor-pointer group'
                                                                    : 'opacity-40 cursor-default'}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-14 bg-neutral-800 rounded overflow-hidden shrink-0 border border-white/5">
                                                                {movie.poster_path && (
                                                                    <img
                                                                        src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                                                        className="object-cover w-full h-full"
                                                                        alt=""
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="text-[10px] font-black uppercase italic truncate text-white">
                                                                    {movie.title}
                                                                </p>
                                                                <p className="text-[8px] text-neutral-500 font-mono mt-0.5">
                                                                    {movie.release_date?.split('-')[0] || 'TBD'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {!isOwned && swapSelection && (
                                                            <div className="bg-green-600/20 p-1.5 rounded-lg group-hover:bg-green-600 transition-colors">
                                                                <Plus size={14} className="text-green-500 group-hover:text-white" />
                                                            </div>
                                                        )}
                                                        {isOwned && (
                                                            <span className="text-[7px] font-bold text-neutral-600 uppercase tracking-tighter">Owned</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 opacity-20">
                                                <Search size={32} className="mb-2" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-center">
                                                    {searchTerm ? "No free agents found" : "Enter a movie title"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ACTION FOOTER */}
                        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="text-left">
                                {statusMessage && (
                                    <p className={`text-[10px] font-black uppercase italic ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                        {statusMessage.text}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => setIsEditTeamModalOpen(false)}
                                    className="flex-1 px-6 py-3 rounded-xl font-black uppercase italic text-[10px] text-neutral-500 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditTeam}
                                    className="flex-1 bg-red-600 px-10 py-3 rounded-xl font-black uppercase italic text-[10px] tracking-widest shadow-lg"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT LEAGUE MODAL */}
            {isUpdateLeagueModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-[2.5rem] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsUpdateLeageModalOpen(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white">
                            <X size={24} />
                        </button>

                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-red-600">Edit your League</h2>

                        <form onSubmit={handleUpdateLeague} className="space-y-8">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="NEW LEAGUE PASSWORD"
                                    className="w-full bg-black border border-slate-800 rounded-2xl py-5 px-6 focus:border-red-600 outline-none transition-all font-black italic uppercase tracking-tighter text-xl"
                                    value={newLeaguePassword}
                                    onChange={(e) => setNewLeaguePassword(e.target.value)}
                                    required
                                />
                            </div>

                            {statusMessage && (
                                <p className={`text-xs font-bold uppercase tracking-widest text-center ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                    {statusMessage.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 py-5 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-lg active:scale-[0.98]"
                            >
                                {isSubmitting ? "SYNCING ROSTER..." : "SAVE CHANGES"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE TEAM MODAL */}
            {isDeleteTeamModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
                    <div className="bg-slate-900 border-2 border-red-600/20 w-full max-w-md rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-600/10 p-4 rounded-full mb-6">
                                <Trash2 size={40} className="text-red-600" />
                            </div>

                            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
                                Delete Your Team?
                            </h2>

                            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                                You are about to delete <span className="text-white font-bold">{userTeamName}</span>.
                                This will remove you from the league and forfeit all your drafted movies.
                                This action is <span className="text-red-500 font-bold underline">permanent</span>.
                            </p>

                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={handleDeleteTeam}
                                    disabled={isDeleting}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-neutral-800 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all"
                                >
                                    {isDeleting ? "DELETING..." : "YES, DELETE TEAM"}
                                </button>

                                <button
                                    onClick={() => setIsDeleteTeamModalOpen(false)}
                                    disabled={isDeleting}
                                    className="w-full bg-neutral-800 hover:bg-neutral-700 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all"
                                >
                                    WAIT, GO BACK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADMIN EDIT MODAL */}
            {isAdminEditModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-md bg-black/80">
                    <div className="bg-slate-900 border border-red-600/30 w-full max-w-5xl rounded-[3rem] p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsAdminEditModalOpen(false)} className="absolute top-8 right-8 text-neutral-500 hover:text-white"><X size={32} /></button>

                        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 text-red-600">Admin Roster Control</h2>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* 1. SELECT TEAM & SLOT */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">1. Select Target Team</label>
                                    <select
                                        onChange={(e) => setSelectedAdminTeam(teams.find(t => t.TeamId === parseInt(e.target.value)))}
                                        className="w-full bg-black border border-neutral-800 p-4 rounded-2xl font-black uppercase italic outline-none focus:border-red-600"
                                    >
                                        <option value="">Choose a Team...</option>
                                        {teams.map(t => <option key={t.TeamId} value={t.TeamId}>{t.TeamName}</option>)}
                                    </select>
                                </div>

                                {selectedAdminTeam && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">2. Select Slot to Overwrite</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedSlot(i + 1);
                                                        setStatusMessage(null);
                                                    }}
                                                    className={`p-3 rounded-xl border font-black text-xs ${selectedSlot === i + 1 ? 'bg-red-600 border-red-600' : 'bg-neutral-800 border-neutral-700'}`}
                                                >
                                                    S{i + 1}
                                                </button>
                                            ))}
                                        </div>

                                        {selectedSlot && (
                                            <div className="mt-6 space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">Current Movie in Slot {selectedSlot}</p>
                                                <MovieCard
                                                    movieId={selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot)?.MovieId || 0}
                                                    isBench={selectedSlot > STARTING_SLOTS}
                                                    title={selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot)?.MovieTitle || "Open Slot"}
                                                    posterUrl={selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot)?.PosterUrl || ""}
                                                    boxOffice={selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot)?.BoxOffice || 0}
                                                    releaseDate={selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot)?.USReleaseDate || ""}
                                                    compact={true}
                                                />

                                                {/* NEW CLEAR SLOT BUTTON */}
                                                {selectedAdminTeam.Picks?.find((p: any) => p.OrderDrafted === selectedSlot) && (
                                                    <button
                                                        onClick={handleAdminClearSlot}
                                                        disabled={isSubmitting}
                                                        className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 border border-red-600/50 text-red-500 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} /> Clear This Slot
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. SEARCH MOVIES */}
                            <div className="lg:col-span-2 space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">3. Search & Assign Movie</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                                    <input
                                        type="text"
                                        placeholder="SEARCH TMDB DATABASE..."
                                        className="w-full bg-black border border-neutral-800 rounded-2xl py-5 pl-12 pr-4 focus:border-red-600 outline-none font-black italic uppercase"
                                        value={adminSearchTerm}
                                        onChange={(e) => setAdminSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {adminSearchResults.map((movie: any) => (
                                        <button
                                            key={movie.id}
                                            onClick={() => handleAdminManualAssign(movie)}
                                            className="flex items-center gap-4 bg-neutral-950 p-3 h-fit rounded-2xl border border-neutral-800 hover:border-red-600 transition-all text-left group"
                                        >
                                            <div className="h-16 w-12 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0">
                                                {movie.poster_path && <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} className="h-full w-full object-cover" />}
                                            </div>
                                            <div>
                                                <h4 className="font-black uppercase italic text-sm leading-tight group-hover:text-red-500">{movie.title}</h4>
                                                <p className="text-[9px] font-mono text-neutral-400">{movie.release_date}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {adminSearchResults.length === 0 && (
                                        <p className="text-center text-neutral-500 font-mono text-sm mt-10">No results found. Try a different search?</p>
                                    )}
                                </div>
                                <div>
                                    {statusMessage && (
                                        <p className={`text-xs font-bold uppercase tracking-widest text-center ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                            {statusMessage.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className='flex md:flex-row flex-col gap-3'>
                                <button
                                    onClick={() => setAdminSettingsOpen(!adminSettingsOpen)}
                                    className="text-md bg-white text-black px-5 py-2 rounded-2xl mt-3 font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                >
                                    {adminSettingsOpen ? 'Hide Admin Settings' : 'Show Admin Settings'}
                                </button>
                                {!(leagueInfo.HasDrafted) && !(leagueInfo.IsDrafting) && (
                                    <Link
                                        href={`/leagues/${leagueInfo.LeagueId}/draft/start`}
                                        className="text-center text-md bg-white text-black px-5 py-2 rounded-2xl mt-3 font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                    >
                                        Start Draft
                                    </Link>
                                )}

                            </div>
                        )}
                        {!(leagueInfo.HasDrafted) && leagueInfo.IsDrafting && (
                            <Link
                                href={`/leagues/${leagueInfo.LeagueId}/draft`}
                                className="text-center text-md bg-white text-black px-5 py-2 rounded-2xl mt-3 font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                            >
                                Go To Draft
                            </Link>
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
                    <div className="flex items-center gap-3">
                        <Users className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Current Teams</p>
                            <p className="font-black italic">{leagueInfo?.Teams?.length || 0} Participants</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserStar className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500">Admin User</p>
                            <p className="font-black italic">{leagueInfo?.AdminName}</p>
                        </div>
                    </div>
                    {/* ADMIN SETTINGS */}
                    {leagueInfo.isAdmin && adminSettingsOpen && (
                        <>
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
                            <div className="flex items-center gap-3">
                                <Settings className="text-red-600" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-neutral-500">League Settings</p>
                                    <button
                                        onClick={() => setIsUpdateLeageModalOpen(true)}
                                        className="text-xs bg-white text-black px-3 py-1 rounded-xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                    >
                                        Edit League
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <UserMinus className="text-red-600" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-neutral-500">Remove Teams</p>
                                    <button
                                        onClick={() => setIsUpdateLeageModalOpen(true)}
                                        className="text-xs bg-white text-black px-3 py-1 rounded-xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                    >
                                        Remove Teams
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Pencil className="text-red-600" size={20} />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-neutral-500">Edit Teams</p>
                                    <button
                                        onClick={() => setIsAdminEditModalOpen(true)}
                                        className="text-xs bg-white text-black px-3 py-1 rounded-xl font-black uppercase italic tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                                    >
                                        Edit Teams
                                    </button>
                                </div>
                            </div>
                        </>

                    )}
                </div>

                {/* --- TAB BAR SECTION --- */}
                <div className="flex items-center gap-2 mb-8 bg-black/40 p-1.5 rounded-[2rem] w-full overflow-x-auto no-scrollbar border border-slate-900 whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-[1.5rem] font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${activeTab === 'teams' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'
                            }`}
                    >
                        <LayoutGrid size={16} className="shrink-0" />
                        <span className="hidden xs:inline">Teams</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('release')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-[1.5rem] font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${activeTab === 'release' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'
                            }`}
                    >
                        <ListOrdered size={16} className="shrink-0" />
                        <span className="hidden xs:inline text-center">Schedule</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 rounded-[1.5rem] font-black uppercase italic tracking-widest text-[10px] sm:text-xs transition-all ${activeTab === 'leaderboard' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'
                            }`}
                    >
                        <Medal size={16} className="shrink-0" />
                        <span className="hidden xs:inline">Stats</span>
                    </button>
                </div>

                {/* Rosters Section */}
                {activeTab === 'teams' && (
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
                                                <p className="text-3xl font-mono font-black">{formatCurrency(totalBoxOffice)}</p>
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
                                                    posterUrl={pick?.PosterUrl}
                                                    boxOffice={pick?.BoxOffice}
                                                    releaseDate={pick?.ReleaseDate}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Release Schedule Section */}
                {activeTab === 'release' && (
                    <ReleaseOrder leagueId={leagueInfo.LeagueId} />
                )}

                {activeTab === 'leaderboard' && (
                    <Leaderboard leagueId={leagueInfo.LeagueId} />
                )}
            </main>
            <Footer />
        </div>
    );
}