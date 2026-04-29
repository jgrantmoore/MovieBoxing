import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image,
    FlatList, RefreshControl
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import Animated, {
    LinearTransition,
    FadeInLeft,
    FadeOutRight
} from 'react-native-reanimated';
import {
    ArrowLeft,
    Trophy,
    Armchair,
    Users,
    LayoutGrid,
    ListOrdered,
    Medal,
    Settings,
    Pencil,
    Trash2,
    Calendar,
    ChevronDown
} from 'lucide-react-native';
import { apiRequest } from '../../../../src/api/client';
import { MovieCard } from '../../../../src/components/MovieCard';
import { FrontOfficeModal } from '../../../../src/components/FrontOfficeModal';
import { LeagueData, LeagueTeam, MoviePick } from '../../../../src/types/league';
import '../../../../global.css';
import { JoinLeagueModal } from '@/src/components/JoinLeagueModal';
import { useAuth } from '@/src/context/AuthContext';
import { LeagueSettingsModal } from '@/src/components/LeagueSettingsModal';

const formatCurrency = (rev: number) => {
    if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(3)}B`;
    return `$${(rev / 1000000).toFixed(1)}M`;
};

export default function LeagueDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session, loading: authLoading } = useAuth();

    // Data States
    const [leagueInfo, setLeagueInfo] = useState<LeagueData | null>(null);
    const [teams, setTeams] = useState<LeagueTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'teams' | 'release' | 'leaderboard'>('teams');

    // UI States
    const [openBench, setOpenBench] = useState<Set<number>>(new Set());
    const [isFrontOfficeOpen, setIsFrontOfficeOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs for scrolling logic
    const parentFlatListRef = useRef<FlatList>(null);
    const scrollRefs = useRef<{ [key: number]: ScrollView | null }>({});
    const scrollOffsets = useRef<{ [key: number]: number }>({});

    useEffect(() => {
        fetchLeagueData();
    }, [id]);

    const fetchLeagueData = async (showIndicator = true) => {
        if (showIndicator) setLoading(true);
        try {
            const data = await apiRequest<LeagueData>(`/leagues?id=${id}`);
            setLeagueInfo(data);
            setTeams(data.Teams || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeagueData(false);
    };

    const handleBack = () => router.back();

    // Mock current user check (Replace '1' with your auth logic if needed)
    const userTeam = useMemo(() => teams.find(t => t.OwnerUserId === Number(session?.user?.userId)), [teams]);

    const handleSwapAction = async (slot1: number, slot2: number) => {
        if (!userTeam) return;
        setIsSubmitting(true);
        try {
            await apiRequest(`/teams/swap`, {
                method: 'POST',
                body: JSON.stringify({ TeamId: userTeam.TeamId, Slot1: slot1, Slot2: slot2 })
            });
            await fetchLeagueData(false);
            setIsFrontOfficeOpen(false);
            Alert.alert("Success", "Roster reshuffled!");
        } catch (err: any) {
            Alert.alert("Ref Stopped the Fight", err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
            onRefresh();
        }
    };

    const confirmLeaveLeague = (teamId: number) => {
        Alert.alert("Resign Position?", "Are you sure you want to leave this league? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Leave League", style: "destructive", onPress: async () => {
                    try {
                        await apiRequest(`/teams/delete?id=${teamId}`, { method: 'DELETE' });
                        router.back();
                    } catch (err) { Alert.alert("Error", "Could not leave league."); }
                }
            }
        ]);
    };

    const toggleBench = async (teamId: number) => {
        const currentX = scrollOffsets.current[teamId] || 0;
        const isClosing = openBench.has(teamId);

        // Emergency Brake
        scrollRefs.current[teamId]?.scrollTo({ x: currentX, animated: false });

        if (isClosing) {
            scrollRefs.current[teamId]?.scrollTo({ x: 0, animated: true });
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setOpenBench((prev) => {
            const next = new Set(prev);
            next.has(teamId) ? next.delete(teamId) : next.add(teamId);
            return next;
        });
    };

    const handleSearchMovies = async (query: string) => {
        try {
            const results = await apiRequest<any[]>(`/movies/search?q=${query}`, {
                method: 'POST',
                body: JSON.stringify({
                    StartDate: leagueInfo?.StartDate,
                    EndDate: leagueInfo?.EndDate,
                    LeagueId: id // Pass LeagueId to check for existing owners
                })
            });
            return results;
        } catch (err) {
            console.error("Search Error:", err);
            return [];
        }
    };

    if (loading || !leagueInfo) {
        return (
            <View className="flex-1 bg-slate-950 items-center justify-center">
                <ActivityIndicator color="#dc2626" size="large" />
            </View>
        );
    }

    const STARTING_SLOTS = leagueInfo.Rules?.Starting || 5;
    const BENCH_SLOTS = leagueInfo.Rules?.Bench || 3;
    const TOTAL_SLOTS = STARTING_SLOTS + BENCH_SLOTS;

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{ headerShown: false }} />

            <FlatList
                ref={parentFlatListRef}
                data={activeTab === 'teams' ? teams : []}
                keyExtractor={(item) => item.TeamId.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />
                }
                ListHeaderComponent={
                    <View className="px-6 py-8">
                        <TouchableOpacity onPress={handleBack} className="mb-6 w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-full items-center justify-center">
                            <ArrowLeft size={20} color="white" />
                        </TouchableOpacity>

                        <View className="flex-row justify-between items-start mb-8">
                            <View className="flex-1">
                                <View className="flex-row items-center mb-2">
                                    <View className={`px-2 py-1 rounded-md mr-3 ${leagueInfo.isPrivate ? 'bg-amber-600/20 border border-amber-600/50' : 'bg-green-600/20 border border-green-600/50'} border`}>
                                        <Text className="text-[10px] font-black text-white uppercase italic">{leagueInfo.isPrivate ? 'Private' : 'Public'}</Text>
                                    </View>
                                    <Text className="text-neutral-500 font-mono text-xs">{teams.length} Teams</Text>
                                </View>
                                <Text className="text-4xl w-80 font-black text-white uppercase italic tracking-tighter">{leagueInfo.LeagueName}</Text>
                                {!(leagueInfo.Joined) && (
                                    <TouchableOpacity onPress={() => setIsJoinModalOpen(true)} className="w-[8rem] bg-red-600 px-3 py-1 rounded-full mt-3">
                                        <Text className="text-white font-black w-full text-center">Join League</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {leagueInfo.isAdmin && (
                                <TouchableOpacity onPress={() => setIsSettingsModalOpen(true)} className="bg-neutral-800 p-3 rounded-xl border border-neutral-700">
                                    <Settings size={20} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View className="flex-row flex-wrap bg-neutral-900/30 border border-neutral-800 rounded-3xl p-4 mb-8">
                            <RuleItem icon={<Trophy size={16} color="#dc2626" />} label="Starters" value={STARTING_SLOTS} />
                            <RuleItem icon={<Armchair size={16} color="#dc2626" />} label="Bench" value={BENCH_SLOTS} />
                            <RuleItem icon={<Users size={16} color="#dc2626" />} label="Commish" value={leagueInfo.AdminName} />
                            <RuleItem icon={<Calendar size={16} color="#dc2626" />} label="Ends" value={new Date(leagueInfo.EndDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC'
                            })} />
                        </View>

                        <View className="flex-row bg-neutral-900 rounded-2xl p-1 mb-6">
                            <TabBtn active={activeTab === 'teams'} label="Teams" icon={<LayoutGrid size={16} color={activeTab === 'teams' ? 'white' : '#737373'} />} onPress={() => setActiveTab('teams')} />
                            <TabBtn active={activeTab === 'release'} label="Schedule" icon={<ListOrdered size={16} color={activeTab === 'release' ? 'white' : '#737373'} />} onPress={() => setActiveTab('release')} />
                            <TabBtn active={activeTab === 'leaderboard'} label="Stats" icon={<Medal size={16} color={activeTab === 'leaderboard' ? 'white' : '#737373'} />} onPress={() => setActiveTab('leaderboard')} />
                        </View>

                        {activeTab === 'release' && <ReleaseOrderView leagueId={Number(id)} leagueInfo={leagueInfo} parentRef={parentFlatListRef} />}
                        {activeTab === 'leaderboard' && <LeaderboardView leagueId={Number(id)} />}
                        {activeTab === 'teams' && leagueInfo.IsDrafting && (
                            <TouchableOpacity onPress={() => router.push(`/leagues/${id}/draft`)} className="bg-red-600 rounded-2xl py-5 flex-row items-center justify-center shadow-lg border-b-4 border-red-800 mb-4">
                                <Trophy size={20} color="white" className="mr-3" />
                                <Text className="text-white font-black uppercase italic text-lg">Enter Draft Arena</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                renderItem={({ item: team }) => {
                    const isUser = team.OwnerUserId === 1;
                    const isBenchOpen = openBench.has(team.TeamId);
                    const totalBoxOffice = (team.Picks || []).reduce((sum: number, p: MoviePick) => p.OrderDrafted <= STARTING_SLOTS ? sum + (p.BoxOffice || 0) : sum, 0);
                    const displaySlots = isBenchOpen ? TOTAL_SLOTS : STARTING_SLOTS;

                    return (
                        <View className="px-6">
                            <View className={`bg-neutral-900/30 border rounded-[2.5rem] p-6 mb-8 ${isUser ? 'border-red-600/50 bg-red-950/5' : 'border-neutral-800'}`}>
                                <View className="flex-row justify-between items-start mb-6">
                                    <View className="flex-1">

                                        <View className="flex-col gap-1 justify-center items-start">
                                            {isUser && (
                                                <View className="bg-red-600 rounded-full px-2 py-0.5">
                                                    <Text className="text-[8px] text-white font-bold uppercase">You</Text>
                                                </View>
                                            )}
                                            <Text className="text-2xl font-black text-red-600 uppercase italic leading-none">
                                                {team.TeamName}
                                            </Text>
                                        </View>
                                        <TouchableOpacity className="text-neutral-500 font-mono text-[10px] mt-1 uppercase tracking-widest" onPress={() => router.navigate(`/profile/${team.OwnerUserId}`)}>
                                            <Text className="text-white font-bold text-[10px] mt-1 uppercase italic tracking-widest">
                                                Manager: {team.Owner}
                                            </Text>
                                        </TouchableOpacity>

                                        {isUser && (
                                            <View className="flex-row gap-2 mt-4">
                                                <TouchableOpacity
                                                    onPress={() => setIsFrontOfficeOpen(true)}
                                                    disabled={!leagueInfo.HasDrafted}
                                                    className={`px-4 py-2 rounded-xl flex-row items-center ${leagueInfo.HasDrafted ? 'bg-red-600' : 'bg-neutral-800 opacity-50'
                                                        }`}
                                                >
                                                    <Pencil size={14} color={leagueInfo.HasDrafted ? "white" : "#737373"} />
                                                    <Text className={`text-[10px] font-black uppercase italic ml-2 ${leagueInfo.HasDrafted ? 'text-white' : 'text-neutral-500'
                                                        }`}>
                                                        Front Office
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => confirmLeaveLeague(team.TeamId)}
                                                    className="bg-neutral-900/50 px-3 py-2 rounded-xl border border-neutral-800"
                                                >
                                                    <Trash2 size={14} color="#737373" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xl font-mono font-black text-white">{formatCurrency(totalBoxOffice)}</Text>
                                        <Text className="text-[8px] text-neutral-600 uppercase font-bold tracking-widest">Team Total</Text>
                                    </View>
                                </View>

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
                                                const slot = idx + 1;
                                                const pick = team.Picks?.find((p: MoviePick) => p.OrderDrafted === slot);
                                                return (
                                                    <Animated.View
                                                        key={`${team.TeamId}-slot-${slot}`}
                                                        layout={LinearTransition.damping(15)}
                                                        entering={FadeInLeft.damping(15).delay(idx * 50)}
                                                        exiting={FadeOutRight.duration(200)}
                                                        style={{ marginRight: 12 }}
                                                    >
                                                        <MovieCard
                                                            movieId={pick?.MovieId || 0}
                                                            title={pick?.Title || "Open Slot"}
                                                            posterUrl={pick?.PosterUrl}
                                                            boxOffice={pick?.BoxOffice}
                                                            isBench={slot > STARTING_SLOTS}
                                                            releaseDate={pick?.ReleaseDate || null}
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
                        </View>
                    );
                }}
            />

            {userTeam && (
                <FrontOfficeModal
                    visible={isFrontOfficeOpen}
                    onClose={() => setIsFrontOfficeOpen(false)}
                    team={userTeam}
                    startingSlots={STARTING_SLOTS}
                    totalSlots={TOTAL_SLOTS}
                    onSwap={handleSwapAction}
                    searchMovies={handleSearchMovies}
                />
            )}

            <JoinLeagueModal
                visible={isJoinModalOpen}
                leagueInfo={leagueInfo}
                onClose={() => { setIsJoinModalOpen(false) }}
                onUpdateSuccess={fetchLeagueData}
            />

            {leagueInfo.isAdmin && (
                <LeagueSettingsModal
                    visible={leagueInfo.isAdmin && isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                    leagueId={leagueInfo.LeagueId}
                    onUpdateSuccess={fetchLeagueData}
                />
            )}

        </View>
    );
}

// --- Helpers ---

const RuleItem = ({ icon, label, value }: any) => (
    <View className="w-1/2 flex-row items-center p-2">
        {icon}
        <View className="ml-2">
            <Text className="text-[8px] uppercase font-bold text-neutral-500">{label}</Text>
            <Text className="text-white font-black italic text-xs uppercase">{value}</Text>
        </View>
    </View>
);

const TabBtn = ({ active, label, icon, onPress }: any) => (
    <TouchableOpacity onPress={onPress} className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${active ? 'bg-red-600' : ''}`}>
        {icon}<Text className={`ml-2 text-[10px] font-black uppercase italic ${active ? 'text-white' : 'text-neutral-500'}`}>{label}</Text>
    </TouchableOpacity>
);

const ReleaseOrderView = ({ leagueId, leagueInfo, parentRef }: { leagueId: number; leagueInfo: LeagueData; parentRef: any }) => {
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const itemLayouts = useRef<{ [key: string]: number }>({});
    const containerY = useRef(0);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await apiRequest<any[]>(`/leagues/release-order?id=${leagueId}`);
                setMovies(data || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchOrder();
    }, [leagueId]);

    const jumpToToday = () => {
        const today = new Date();
        const upcomingMovie = movies.find(m => new Date(m.ReleaseDate) >= today);
        const targetMovie = upcomingMovie || movies[movies.length - 1];
        if (targetMovie) {
            const y = containerY.current + (itemLayouts.current[targetMovie.MovieId] || 0);
            parentRef.current?.scrollToOffset({ offset: y - 20, animated: true });
        }
    };

    if (loading) return <ActivityIndicator color="#dc2626" className="py-10" />;

    return (
        <View onLayout={(e) => containerY.current = e.nativeEvent.layout.y}>
            <TouchableOpacity onPress={jumpToToday} activeOpacity={0.9} className="bg-red-600 px-5 py-3 rounded-full flex-row items-center self-center mb-6">
                <Calendar size={14} color="white" /><Text className="text-white font-black uppercase italic text-[11px] ml-2">Jump to Today</Text><ChevronDown size={14} color="white" className="ml-1" />
            </TouchableOpacity>
            {movies.map((movie) => {
                const isReleased = new Date(movie.ReleaseDate) <= new Date();
                const delayed = new Date(movie.ReleaseDate) > new Date(leagueInfo.EndDate);
                return (
                    <View
                        key={movie.MovieId}
                        onLayout={(e) => itemLayouts.current[movie.MovieId] = e.nativeEvent.layout.y}
                        className={`flex-row items-center bg-neutral-900/40 border rounded-[2rem] p-4 mb-4 ${isReleased ? 'border-green-800 opacity-30' : delayed ? 'opacity-30' : 'border-red-600/30'}`}
                    >
                        <View className="w-14 h-20 bg-black rounded-xl overflow-hidden">
                            <Image source={{ uri: `https://image.tmdb.org/t/p/w200${movie.PosterUrl}` }} className="w-full h-full" />
                        </View>
                        <View className="flex-1 mx-4">
                            <Text className="text-white font-black uppercase italic text-sm" numberOfLines={1}>{movie.Title}</Text>
                            <Text className="text-neutral-500 text-[12px] uppercase">{movie.OwnedBy?.Owner} • {movie.OwnedBy?.TeamName}</Text>
                            <Text className="text-neutral-500 text-[12px] mt-2 italic">{new Date(movie.ReleaseDate).toLocaleDateString()}</Text>
                        </View>
                        <View className="items-end pr-2">
                            <Text className="font-mono font-black text-white">{formatCurrency(movie.BoxOffice || 0)}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const LeaderboardView = ({ leagueId }: { leagueId: number }) => {
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const data = await apiRequest<any[]>(`/leagues/leaderboard?id=${leagueId}`);
                setRankings(data || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchRankings();
    }, [leagueId]);

    const formatCurrency = (rev: number) => {
        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(3)}B`;
        return `$${(rev / 1000000).toFixed(1)}M`;
    };

    if (loading) return <ActivityIndicator color="#dc2626" className="py-10" />;

    return (
        <View>
            {rankings.map((player, index) => {
                const isFirst = index === 0;
                return (
                    <View
                        key={player.TeamId}
                        className={`rounded-[2rem] p-6 mb-4 border-2 ${isFirst ? 'bg-red-600 border-red-500' : 'bg-neutral-900/40 border-neutral-800'}`}
                    >
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1 pr-4">
                                <Text className="text-xl font-black text-white uppercase italic" numberOfLines={2}>{player.TeamName}</Text>
                                <Text className={`text-[10px] uppercase font-bold tracking-tight ${isFirst ? 'text-white/70' : 'text-neutral-500'}`} numberOfLines={1}>
                                    MVP: {player.TopMovie || 'N/A'}
                                </Text>
                            </View>
                            <View className="shrink-0 items-end">
                                <Text className="text-2xl font-mono font-black text-white">{formatCurrency(player.TotalRevenue)}</Text>
                                <Text className={`text-[8px] font-bold uppercase tracking-tighter ${isFirst ? 'text-white/50' : 'text-neutral-600'}`}>Total Gross</Text>
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};