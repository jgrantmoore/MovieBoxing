import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    ScrollView, 
    View, 
    Text, 
    TouchableOpacity, 
    ActivityIndicator, 
    RefreshControl 
} from 'react-native';
import Animated, { 
    LinearTransition, 
    FadeInLeft, 
    FadeOutRight 
} from 'react-native-reanimated';
import { Link, router } from 'expo-router';
import { MovieCard } from '../../../src/components/MovieCard';
import { apiRequest } from '../../../src/api/client';
import { Team } from '../../../src/types/league';
import { Plus, Search } from 'lucide-react-native';
import { RefreshContext } from '@/src/context/RefreshContext';
import '../../../global.css';

export default function Leagues() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openBench, setOpenBench] = useState<Set<number>>(new Set());
    const { refreshSignal } = useContext(RefreshContext);

    // Refs for scrolling logic
    const scrollRefs = useRef<{ [key: number]: ScrollView | null }>({});
    const scrollOffsets = useRef<{ [key: number]: number }>({});

    const STARTING_SLOTS = 5;

    const fetchLeagues = async (showLoadingIndicator = true) => {
        if (showLoadingIndicator) setLoading(true);
        try {
            const data = await apiRequest<Team[]>('/teams/my-teams');
            setTeams(data || []);
        } catch (err) {
            console.error("Leagues fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeagues();
    }, [refreshSignal]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeagues(false);
    };

    // Async toggle to handle scroll-back before filtering
    const toggleBench = async (teamId: number) => {
        const currentX = scrollOffsets.current[teamId] || 0;
        const isClosing = openBench.has(teamId);

        // Emergency Brake: stop any user momentum immediately
        scrollRefs.current[teamId]?.scrollTo({ x: currentX, animated: false });

        if (isClosing) {
            // 1. Force scroll back to start
            scrollRefs.current[teamId]?.scrollTo({ x: 0, animated: true });
            
            // 2. Wait for scroll animation (~300ms) before removing items from layout
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setOpenBench((prev) => {
            const next = new Set(prev);
            next.has(teamId) ? next.delete(teamId) : next.add(teamId);
            return next;
        });
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-950 items-center justify-center">
                <ActivityIndicator color="#dc2626" size="large" />
            </View>
        );
    }

    return (
        <ScrollView 
            className="flex-1 bg-slate-950"
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    tintColor="#dc2626" 
                />
            }
        >
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
                            const displaySlots = isBenchOpen 
                                ? (team.StartingNumber + team.BenchNumber) 
                                : team.StartingNumber;

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
                                    <View className="mx-[-24px]">
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            ref={(el) => { scrollRefs.current[team.TeamId] = el; }}
                                            onScroll={(event) => {
                                                scrollOffsets.current[team.TeamId] = event.nativeEvent.contentOffset.x;
                                            }}
                                            scrollEventThrottle={16}
                                        >
                                            <View className="flex-row px-6">
                                                {Array.from({ length: displaySlots }).map((_, idx) => {
                                                    const slotNumber = idx + 1;
                                                    const pick = team.Picks.find(p => p.OrderDrafted === slotNumber);

                                                    return (
                                                        <Animated.View
                                                            key={`${team.TeamId}-slot-${slotNumber}`}
                                                            layout={LinearTransition.damping(15)}
                                                            entering={FadeInLeft.damping(15).delay(idx * 50)}
                                                            exiting={FadeOutRight.duration(200)}
                                                            style={{ marginRight: 12 }}
                                                        >
                                                            <MovieCard
                                                                movieId={pick?.MovieId || 0}
                                                                title={pick?.Title || "Open Slot"}
                                                                posterUrl={pick?.PosterUrl || null}
                                                                boxOffice={pick?.BoxOffice || 0}
                                                                releaseDate={pick?.ReleaseDate || null}
                                                                isBench={slotNumber > STARTING_SLOTS}
                                                            />
                                                        </Animated.View>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => toggleBench(team.TeamId)}
                                        activeOpacity={0.7}
                                        className="mt-6 py-4 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl items-center"
                                    >
                                        <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                                            {isBenchOpen ? '← Hide Benched Movies' : '→ View Full Roster'}
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
        </ScrollView>
    );
}