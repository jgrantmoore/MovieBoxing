import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MovieCard } from '../../src/components/MovieCard';
import { apiRequest } from '../../src/api/client';
import { Team, TopPerformer } from '../../src/types/league';
import { useAuth } from '../../src/context/AuthContext';
import { Link } from 'expo-router';
import '../../global.css';

export default function Dashboard() {
    const { session, loading: authLoading } = useAuth(); // Destructure authLoading
    const [teams, setTeams] = useState<Team[]>([]);
    const [topMovies, setTopMovies] = useState<TopPerformer[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openBench, setOpenBench] = useState(new Set());
    const router = useRouter();

    useEffect(() => {
        // GUARD 1: Don't fetch if the auth is still loading or if there's no session
        if (authLoading || !session?.user?.id) return;

        const fetchData = async () => {
            try {
                const teamData = await apiRequest('/teams/my-teams');
                const topData = await apiRequest(`/user/top-performing-movies?id=${session.user.id}`);
                setTopMovies(topData);
                setTeams(teamData);
            } catch (err) {
                console.error("Dashboard data fetch error:", err);
            } finally {
                setDataLoading(false);
            }
        };

        fetchData();
    }, [authLoading, session?.user?.id]); // Depend on auth state

    const toggleBench = (name: string) => {
        const next = new Set(openBench);
        next.has(name) ? next.delete(name) : next.add(name);
        setOpenBench(next);
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
        <ScrollView className="flex-1 bg-slate-950 px-6 py-8">
            {/* Header */}
            <View className="mb-10">
                <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                    YOUR <Text className="text-red-600">DASHBOARD</Text>
                </Text>
                {/* Now session.user.name is guaranteed to exist */}
                <Text className="text-neutral-500 font-mono uppercase tracking-widest text-xs mt-2">
                    Welcome back, {session.user.name}
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
                    const totalBoxOffice = team.Picks.reduce((sum, p) =>
                        p.IsStarting ? sum + (p.BoxOffice || 0) : sum, 0
                    );

                    const visiblePicks = team.Picks.filter(p =>
                        openBench.has(team.LeagueName) ? true : p.IsStarting
                    );

                    return (
                        <View key={team.LeagueId} className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-5 mb-6">
                            <View className="flex-row justify-between items-start mb-6">
                                <View className="flex-1 mr-4">
                                    <TouchableOpacity 
                                        onPress={() => router.push({
                                            pathname: "/leagues/[id]",
                                            params: { id: team.LeagueId } // Use team.LeagueId here
                                        })}
                                    >
                                        <Text className="text-2xl font-black uppercase italic text-red-600 leading-none">
                                            {team.LeagueName}
                                        </Text>
                                        <Text className="text-neutral-500 font-black font-medium text-[12px] mt-1 uppercase tracking-tighter">
                                            {team.TeamName}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View className="items-end">
                                    <Text className="text-[8px] uppercase font-bold text-neutral-500 tracking-widest">Total Gross</Text>
                                    <Text className="text-xl font-mono font-black text-white">
                                        ${(totalBoxOffice / 1000000).toFixed(1)}M
                                    </Text>
                                </View>
                            </View>

                            <View className="mx--5">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                                    {visiblePicks.map((pick) => (
                                        <MovieCard
                                            key={pick.MovieId}
                                            movieId={pick.MovieId}
                                            title={pick.Title}
                                            posterUrl={pick.PosterUrl}
                                            boxOffice={pick.BoxOffice}
                                            releaseDate={pick.ReleaseDate}
                                            isBench={!pick.IsStarting}
                                        />
                                    ))}
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={() => toggleBench(team.LeagueName)}
                                activeOpacity={0.7}
                                className="mt-6 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-2xl items-center"
                            >
                                <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                                    {openBench.has(team.LeagueName) ? 'Hide Benched Movies' : 'View Full Roster'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}