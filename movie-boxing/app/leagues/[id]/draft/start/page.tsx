'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
// Run: npm install @hello-pangea/dnd
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function StartDraftPage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const router = useRouter();

    const [league, setLeague] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchData() {
            if (!session?.accessToken || !id) return;
            try {
                const leagueRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues/info?id=${id}`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });

                const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leagues?id=${id}`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });

                if (leagueRes.ok && teamsRes.ok) {
                    const leagueData = await leagueRes.json();
                    const teamsData = await teamsRes.json();
                    setLeague(leagueData);
                    // Sort by existing DraftOrder if available, otherwise default to TeamId
                    const sortedTeams = (teamsData.Teams || []).sort((a: any, b: any) => (a.DraftOrder || 0) - (b.DraftOrder || 0));
                    setTeams(sortedTeams);
                } else {
                    setError("Could not load draft details.");
                }
            } catch (err) {
                setError("Network error occurred.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [session, id]);

    // Drag and Drop Handler
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const reorderedTeams = Array.from(teams);
        const [removed] = reorderedTeams.splice(result.source.index, 1);
        reorderedTeams.splice(result.destination.index, 0, removed);

        setTeams(reorderedTeams);
    };

    const handleStartDraft = async () => {
        setIsSubmitting(true);
        setError("");

        // Map the current state of the UI list to the payload
        const draftOrderPayload = teams.map((t, idx) => ({
            teamId: t.TeamId,
            order: idx + 1
        }));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drafts/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leagueId: id,
                    newOrder: draftOrderPayload // Sending the order here
                })
            });

            if (res.ok) {
                router.push(`/leagues/${id}/draft`);
            } else {
                const msg = await res.text();
                setError(msg || "Failed to start draft.");
                setIsSubmitting(false);
            }
        } catch (err) {
            setError("An error occurred connecting to the server.");
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950" />;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500">
            <Navbar />
            <div className="max-w-5xl mx-auto px-6 py-20">
                <header className="mb-12">
                    <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
                        Initialize <span className="text-red-600">Draft</span>
                    </h1>
                    <p className="text-neutral-500 font-mono uppercase tracking-widest text-sm">
                        Confirming {league?.LeagueName} Roster & Order
                    </p>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* LEFT: Draft Order Reorderable List */}
                    <div className="lg:col-span-1">
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="draftOrder">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                        {teams.map((team, index) => (
                                            <Draggable key={team.TeamId} draggableId={team.TeamId.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`flex items-center gap-4 border p-4 rounded-xl transition-all ${snapshot.isDragging ? 'bg-neutral-800 border-red-600 scale-105 shadow-2xl z-50' : 'bg-neutral-900/60 border-neutral-800'}`}
                                                    >
                                                        <span className="text-2xl font-black italic text-neutral-700">
                                                            {(index + 1).toString().padStart(2, '0')}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-black uppercase italic text-white leading-tight">{team.TeamName}</p>
                                                            <p className="text-[10px] font-mono uppercase text-neutral-500">{team.Owner}</p>
                                                        </div>
                                                        <div className="text-neutral-700">☰</div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    {/* RIGHT: Settings */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-neutral-900/40 rounded-3xl border border-neutral-800 p-8 shadow-2xl">
                            {error && <p className="text-red-500 font-bold mb-4 uppercase text-xs italic">!! {error}</p>}
                            <h2 className="text-2xl font-black uppercase italic mb-8 border-b border-neutral-800 pb-4">Final Configuration</h2>
                            <div className="grid grid-cols-2 gap-8 mb-12">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mb-1">Starters / Bench</p>
                                    <p className="text-2xl font-mono text-white">{league?.StartingNumber} / {league?.BenchNumber}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mb-1">Free Agency</p>
                                    <p className="text-2xl font-black italic uppercase text-white">{league?.FreeAgentsAllowed ? "Enabled" : "Disabled"}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleStartDraft}
                                disabled={isSubmitting}
                                className={`w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase italic text-xl transition-all ${isSubmitting ? 'opacity-50 grayscale' : 'hover:bg-red-700'}`}
                            >
                                {isSubmitting ? 'Initializing...' : 'Start Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}