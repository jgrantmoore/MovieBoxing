import React, { useState, useEffect, useContext } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { MovieCard } from '../../../src/components/MovieCard';
import { apiRequest } from '../../../src/api/client';
import { Team } from '../../../src/types/league';
import { Plus, Search } from 'lucide-react-native';
import '../../../global.css';
import { RefreshContext } from '@/src/context/RefreshContext';

export default function Leagues() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [openBench, setOpenBench] = useState<Set<number>>(new Set());
    const { refreshSignal } = useContext(RefreshContext);

    const STARTING_SLOTS = 5;

    useEffect(() => {
        const fetchLeagues = async () => {
            try {
                const data = await apiRequest('/teams/my-teams');
                setTeams(data);
            } catch (err) {
                console.error("Leagues fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeagues();
    }, [refreshSignal]);

    const toggleBench = (teamId: number) => {
        const next = new Set(openBench);
        next.has(teamId) ? next.delete(teamId) : next.add(teamId);
        setOpenBench(next);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-950 items-center justify-center">
                <ActivityIndicator color="#dc2626" size="large" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-950">
            <View className="px-6 py-8">

                {/* Header Section */}
                <View className="flex-row justify-between items-end mb-10">
                    <View>
                        <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                            YOUR <Text className="text-red-600">LEAGUES</Text>
                        </Text>
                        <Text className="text-neutral-500 font-mono uppercase tracking-widest text-[10px] mt-2">
                            Manage your rosters
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-3 mb-12">
                    <Link href="/leagues/search" asChild>
                        <TouchableOpacity className="flex-1 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex-row items-center justify-center">
                            <Search size={18} color="#dc2626" />
                            <Text className="text-white font-black uppercase italic ml-2 text-xs">Search</Text>
                        </TouchableOpacity>
                    </Link>
                    <Link href="/leagues/create" asChild>
                        <TouchableOpacity className="flex-1 bg-red-600 p-4 rounded-2xl flex-row items-center justify-center">
                            <Plus size={18} color="white" />
                            <Text className="text-white font-black uppercase italic ml-2 text-xs">Create</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {/* Leagues List */}
                <View className="space-y-12 pb-20">
                    {teams.length > 0 ? (
                        teams.map((team) => {
                            const totalBoxOffice = team.Picks.reduce((sum, p) =>
                                p.OrderDrafted <= STARTING_SLOTS ? sum + (p.BoxOffice || 0) : sum, 0
                            );

                            const isBenchOpen = openBench.has(team.TeamId);
                            // Show all slots if bench is open, otherwise show starting 5
                            const displaySlots = isBenchOpen ? (team.StartingNumber + team.BenchNumber) : team.StartingNumber;

                            return (
                                <View key={team.TeamId} className="mb-10">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <View className="flex-1">
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: "/(tabs)/leagues/[id]",
                                                    params: { id: team.LeagueId }
                                                })}
                                            >
                                                <Text className="text-2xl font-black uppercase italic text-white">
                                                    {team.LeagueName}
                                                </Text>
                                            </TouchableOpacity>
                                            <Text className="text-neutral-500 font-mono text-[10px] uppercase">
                                                {team.TeamName}
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-xl font-mono font-black text-red-600">
                                                ${(totalBoxOffice / 1000000).toFixed(1)}M
                                            </Text>
                                            <Text className="text-[8px] text-neutral-600 uppercase font-bold tracking-widest">Team Total</Text>
                                        </View>
                                    </View>

                                    {/* Horizontal Swipeable Roster */}
                                    <View className="mx--6">
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            className='px-0'
                                        >
                                            {Array.from({ length: displaySlots }).map((_, idx) => {
                                                const slotNumber = idx + 1;
                                                const pick = team.Picks.find(p => p.OrderDrafted === slotNumber);

                                                return (
                                                    <MovieCard
                                                        key={`${team.TeamId}-slot-${slotNumber}`}
                                                        movieId={pick?.MovieId || 0}
                                                        title={pick?.Title || "Open Slot"}
                                                        posterUrl={pick?.PosterUrl || null}
                                                        boxOffice={pick?.BoxOffice || 0}
                                                        releaseDate={pick?.ReleaseDate || null}
                                                        isBench={slotNumber > STARTING_SLOTS}
                                                    />
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => toggleBench(team.TeamId)}
                                        className="mt-4 py-2 border-b border-neutral-900 items-center"
                                    >
                                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-[2px]">
                                            {isBenchOpen ? '← Close Bench' : '→ View Bench Slots'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    ) : (
                        <View className="bg-neutral-900/50 rounded-3xl border-2 border-dashed border-neutral-800 p-12 items-center">
                            <Text className="text-neutral-500 italic mb-4">No active leagues found.</Text>
                            <Link href="/leagues/search" asChild>
                                <TouchableOpacity>
                                    <Text className="text-red-600 font-black uppercase italic">Find a league →</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView >
    );
}