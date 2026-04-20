import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { MovieCard } from '../../src/components/MovieCard';
import { apiRequest } from '../../src/api/client';
import { Team, TopPerformer } from '../../src/types/league';
import { useAuth } from '../../src/context/AuthContext';
import { Link } from 'expo-router';
import '../../global.css';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Dashboard() {
    const { session, loading: authLoading } = useAuth(); // Destructure authLoading
    const [teams, setTeams] = useState<Team[]>([]);
    const [topMovies, setTopMovies] = useState<TopPerformer[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [openBench, setOpenBench] = useState(new Set());
    const router = useRouter();

    const fetchData = useCallback(async (showLoadingIndicator = true) => {
        const currentUserId = session?.user?.userId;
        if (!currentUserId) return;

        if (showLoadingIndicator) setDataLoading(true);

        try {
            const [teamData, topData] = await Promise.all([
                apiRequest('/teams/my-teams'),
                apiRequest(`/user/top-performing-movies?id=${currentUserId}`)
            ]);

            setTopMovies(topData || []);
            setTeams(teamData || []);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setDataLoading(false);
            setRefreshing(false); // Stop the spinner
        }
    }, [session?.user?.userId]);

    // 2. Initial Load
    useEffect(() => {
        if (!authLoading && session) {
            fetchData(true);
        }
    }, [authLoading, session, fetchData]);

    // 3. Refresh Handler
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(false);
    }, [fetchData]);

    const toggleBench = (name: string) => {
        // This tells the native driver: "Animate whatever changes happen next"
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        const next = new Set(openBench);
        next.has(name) ? next.delete(name) : next.add(name);
        setOpenBench(next);
    };

    const handleLeaguePress = (leagueId: number) => {
        // 1. Navigate to the Tab first
        router.navigate('/(tabs)/leagues');

        // 2. Push the specific league onto that tab's stack
        // We use a small timeout or 'push' to ensure the tab has initialized
        setTimeout(() => {
            router.push(`/(tabs)/leagues/${leagueId}`);
        }, 100);
    };

    // GUARD 2: Show a loading screen if the session isn't ready yet
    // This prevents the "Cannot read property 'name' of null" error below
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
            // 4. Add RefreshControl here
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#dc2626" // For iOS
                    colors={["#dc2626"]} // For Android
                />
            }
        >
            {/* Header */}
            <View className="mb-10">
                <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                    YOUR <Text className="text-red-600">DASHBOARD</Text>
                </Text>
                {/* Now session.user.name is guaranteed to exist */}
                <Text className="text-neutral-500 font-mono uppercase tracking-widest text-xs mt-2">
                    Welcome back, {session.user.displayName}
                </Text>
            </View>

            {/* Section 1: Top Performers */}
            <View className="mb-12">
                <Text className="text-xl font-black uppercase italic text-white mb-6 border-l-4 border-red-600 pl-3">
                    Top Performers
                </Text>

                {dataLoading ? (
                    <ActivityIndicator color="#dc2626" />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {topMovies.map((movie) => (
                            <MovieCard
                                key={movie.MovieId}
                                movieId={movie.MovieId}
                                title={movie.Title}
                                posterUrl={movie.PosterUrl}
                                boxOffice={movie.BoxOffice}
                                releaseDate={movie.InternationalReleaseDate}
                                isBench={false}
                            />
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Section 2: Active Leagues */}
            <View className="space-y-8 pb-20">
                <Text className="text-xl font-black uppercase italic text-white mb-6 border-l-4 border-red-600 pl-3">
                    Active Leagues
                </Text>

                {teams.map((team) => {
                    const isBenchOpen = openBench.has(team.LeagueName);
                    const totalBoxOffice = team.Picks.reduce((sum, p) =>
                        p.IsStarting ? sum + (p.BoxOffice || 0) : sum, 0
                    );

                    return (
                        <View key={team.LeagueId} className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-5 mb-6">
                            {/* Header section remains the same */}
                            <View className="flex-row justify-between items-start mb-6">
                                <View className="flex-1 mr-4">
                                    <TouchableOpacity onPress={() => handleLeaguePress(team.LeagueId)}>
                                        <Text className="text-2xl font-black uppercase italic text-red-600 leading-none">
                                            {team.LeagueName}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Total Gross section remains same */}
                            </View>

                            <View className="mx--5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                                    {team.Picks.map((pick) => {
                                        // Determine if this specific card should be hidden
                                        const shouldHide = !pick.IsStarting && !isBenchOpen;

                                        return (
                                            <View
                                                key={pick.MovieId}
                                                style={{
                                                    // This is the "Magic": Animate the width and opacity
                                                    width: shouldHide ? 0 : 140, // Match your MovieCard width
                                                    opacity: shouldHide ? 0 : 1,
                                                    overflow: 'hidden',
                                                    // iOS specific: smooth transition
                                                    transform: [{ scale: shouldHide ? 0.8 : 1 }]
                                                }}
                                            // Use a transition-style duration if you have Reanimated, 
                                            // otherwise LayoutAnimation will now pick this up much better.
                                            >
                                                <MovieCard
                                                    movieId={pick.MovieId}
                                                    title={pick.Title}
                                                    posterUrl={pick.PosterUrl}
                                                    boxOffice={pick.BoxOffice}
                                                    releaseDate={pick.ReleaseDate}
                                                    isBench={!pick.IsStarting}
                                                />
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={() => toggleBench(team.LeagueName)}
                                activeOpacity={0.7}
                                className="mt-6 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl items-center"
                            >
                                <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                                    {isBenchOpen ? 'Hide Benched Movies' : 'View Full Roster'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}