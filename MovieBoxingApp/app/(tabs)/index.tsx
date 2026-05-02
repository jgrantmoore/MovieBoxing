import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { MovieCard } from '../../src/components/MovieCard';
import { apiRequest } from '../../src/api/client';
import { Team, TopPerformer } from '../../src/types/league';
import { useAuth } from '../../src/context/AuthContext';
import '../../global.css';

export default function Dashboard() {
    const { session, loading: authLoading } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [topMovies, setTopMovies] = useState<TopPerformer[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());

    // Ref to manage scrolling for multiple league lists
    const scrollRefs = useRef<{ [key: number]: ScrollView | null }>({});
    // Inside your Dashboard component
    const scrollOffsets = useRef<{ [key: number]: number }>({});
    const router = useRouter();

    const fetchData = useCallback(async (showLoadingIndicator = true) => {
        const currentUserId = session?.user?.userId;
        if (!currentUserId) return;
        if (showLoadingIndicator) setDataLoading(true);

        try {
            const [teamData, topData] = await Promise.all([
                apiRequest<Team[]>('/teams/my-teams'),
                apiRequest<TopPerformer[]>(`/user/top-performing-movies?id=${currentUserId}`)
            ]);
            setTopMovies(topData || []);
            setTeams(teamData || []);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setDataLoading(false);
            setRefreshing(false);
        }
    }, [session?.user?.userId]);

    useEffect(() => {
        if (!authLoading && session) {
            fetchData(true);
        }
    }, [authLoading, session, fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(false);
    }, [fetchData]);

    // Async toggle to handle scroll-back before filtering
    const toggleBench = async (leagueId: number, leagueName: string) => {
        const currentX = scrollOffsets.current[leagueId] || 0;
        const isClosing = openBench.has(leagueName);

        scrollRefs.current[leagueId]?.scrollTo({ x: currentX, animated: false });

        if (isClosing) {
            // 1. Force scroll to start

            scrollRefs.current[leagueId]?.scrollTo({ x: 0, animated: true });
            // 2. Wait for scroll to finish before removing items from DOM
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setOpenBench((prev) => {
            const next = new Set(prev);
            next.has(leagueName) ? next.delete(leagueName) : next.add(leagueName);
            return next;
        });
    };

    const handleLeaguePress = (leagueId: number) => {
        router.navigate('/(tabs)/leagues');
        setTimeout(() => {
            router.push(`/(tabs)/leagues/${leagueId}`);
        }, 100);
    };

    if (authLoading || !session) {
        return (
            <View className="flex-1 bg-slate-950 items-center justify-center">
                <ActivityIndicator color="#dc2626" size="large" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-slate-950 px-6 py-8"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" colors={["#dc2626"]} />
            }
        >
            {/* Header */}
            <View className="mb-10">
                <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                    YOUR <Text className="text-red-600">DASHBOARD</Text>
                </Text>
                <Text className="text-neutral-500 font-mono uppercase tracking-widest text-xs mt-2">
                    Welcome back, {session.user.displayName}
                </Text>
            </View>

            {/* Section 1: Top Performers (Staggered Load) */}
            <View className="mb-12">
                <Text className="text-xl font-black uppercase italic text-white mb-6 border-l-4 border-red-600 pl-3">
                    Top Performers
                </Text>

                {dataLoading ? (
                    <ActivityIndicator color="#dc2626" />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row">
                            {topMovies.map((movie, index) => (
                                <Animated.View
                                    key={`top-${movie.MovieId}`}
                                    entering={FadeInLeft.damping(15).delay(index * 100)}
                                    layout={LinearTransition.damping(15)}
                                    style={{ marginRight: 12 }}
                                >
                                    <MovieCard
                                        movieId={movie.MovieId}
                                        title={movie.Title}
                                        posterUrl={movie.PosterUrl}
                                        boxOffice={movie.BoxOffice}
                                        releaseDate={movie.InternationalReleaseDate}
                                        isBench={false}
                                    />
                                </Animated.View>
                            ))}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Section 2: Active Leagues */}
            <View className="space-y-8 pb-20">
                <Text className="text-xl font-black uppercase italic text-white mb-6 border-l-4 border-red-600 pl-3">
                    Active Teams
                </Text>

                {teams.map((team) => {
                    const isBenchOpen = openBench.has(team.LeagueName);
                    const visiblePicks = team.Picks.filter(p => p.IsStarting || isBenchOpen);

                    return (
                        <View key={team.LeagueId} className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-5 mb-6">
                            <View className="flex-row justify-between items-start mb-4">
                                <View className="flex-1 mr-4">
                                    <TouchableOpacity onPress={() => handleLeaguePress(team.LeagueId)}>
                                        <Text className="text-2xl font-black uppercase italic text-white leading-none">
                                            {team.LeagueName}
                                        </Text>
                                        <Text className="text-l font-black uppercase italic text-red-600 leading-none">
                                            {team.TeamName}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="mx--5">
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    ref={(el) => { scrollRefs.current[team.LeagueId] = el; }}
                                    // Update the ref with the current X position
                                    onScroll={(event) => {
                                        scrollOffsets.current[team.LeagueId] = event.nativeEvent.contentOffset.x;
                                    }}
                                    // scrollEventThrottle ensures the event fires frequently enough to be accurate
                                    scrollEventThrottle={16}
                                >
                                    <View className="flex-row px-5">
                                        {visiblePicks.map((pick, index) => (
                                            <Animated.View
                                                key={`${team.LeagueId}-${pick.MovieId}`}
                                                layout={LinearTransition.springify().damping(15).stiffness(100)}
                                                entering={!pick.IsStarting && isBenchOpen ? FadeInLeft.duration(200) : FadeInLeft.damping(15).delay(index * 50)}
                                                exiting={FadeOutRight.duration(200)}
                                                style={{ marginRight: 12 }}
                                            >
                                                <MovieCard
                                                    movieId={pick.MovieId}
                                                    title={pick.Title}
                                                    posterUrl={pick.PosterUrl}
                                                    boxOffice={pick.BoxOffice}
                                                    releaseDate={pick.ReleaseDate}
                                                    isBench={!pick.IsStarting}
                                                />
                                            </Animated.View>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={() => toggleBench(team.LeagueId, team.LeagueName)}
                                activeOpacity={0.7}
                                className="mt-6 py-4 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl items-center"
                            >
                                <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                                    {isBenchOpen ? '← Hide Benched Movies' : '→ View Full Roster'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}