import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Trophy, Film, Scale, Zap, UserPlus, ChevronRight } from 'lucide-react-native';
import { apiRequest } from '../api/client';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { TopPerformer } from '../types/league';
import { MovieCard } from './MovieCard';

export default function ProfileView({ userId }: { userId: string | number }) {
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [topMovies, setTopMovies] = useState<TopPerformer[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const { session, loading: authLoading } = useAuth(); // Destructure authLoading
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        fetchProfile();
        fetchTopMovies();
        setLoading(false);
    }, [userId]);

    const fetchProfile = async () => {
        try {
            // Assuming your apiRequest helper handles the Auth Bearer token
            const data = await apiRequest(`/user/stats?id=${userId}`);
            setUserInfo(data);
            setStats([
                { label: "Total Earnings", value: `$${data.TotalEarnings.toLocaleString()}`, icon: <Zap size={20} color="#facc15" /> },
                { label: "Leagues Won", value: data.LeaguesWon, icon: <Trophy size={20} color="#dc2626" /> },
                { label: "Total Trades", value: "--", icon: <Scale size={20} color="#3b82f6" /> },
                { label: "Movies Picked", value: data.MovieCount, icon: <Film size={20} color="#a855f7" /> },
            ]);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not load fighter profile.");
        }
    };

    const fetchTopMovies = async () => {
        try {
            const data = await apiRequest(`/user/top-performing-movies?id=${userId}`);
            setTopMovies(data);
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) {
        return (
            <View className="flex-1 bg-slate-950 items-center justify-center">
                <Text className="text-red-600 font-black italic text-2xl animate-pulse uppercase">Loading Profile...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-slate-950">
            <View className="px-6 py-12">
                {/* Header */}
                <View className="border-b border-white/10 pb-10 mb-10">
                    <Text className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                        {userInfo?.DisplayName || "Unknown Fighter"}
                    </Text>
                    <Text className="text-sm font-black text-red-600 uppercase italic tracking-widest mt-2">
                        {userInfo?.Username ? `@${userInfo.Username}` : ""}
                    </Text>

                    {/* Only show invite if not looking at self (Logic depends on your Auth storage) */}
                    {session?.user?.id !== userId && (
                        <TouchableOpacity className="mt-8 flex-row items-center justify-center bg-white py-4 rounded-2xl">
                            <UserPlus size={20} color="black" strokeWidth={3} />
                            <Text className="ml-3 text-black font-black uppercase italic tracking-widest">Invite To League</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View className="mb-12">
                    <Text className="text-xl font-black uppercase italic text-white mb-6 border-l-4 border-red-600 pl-3">
                        Top Performers
                    </Text>

                    {loading ? (
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

                {/* Career Analytics */}
                <View className="mb-12">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500 mb-6">Career Analytics</Text>
                    <View className="flex-row flex-wrap justify-between">
                        {stats.map((stat, i) => (
                            <View key={i} className="w-[48%] bg-neutral-900/50 border border-neutral-800 p-5 rounded-[2rem] mb-4">
                                <View className="mb-3">{stat.icon}</View>
                                <Text className="text-[8px] uppercase font-bold text-neutral-500 tracking-widest mb-1">{stat.label}</Text>
                                <Text className="text-xl font-black italic text-white uppercase">{stat.value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Recent Arenas */}
                <View>
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">Current Arenas</Text>
                        <Text className="text-[8px] font-mono text-neutral-600 uppercase">{userInfo?.RecentLeagues?.length || 0} Active</Text>
                    </View>

                    <View className="gap-y-4">
                        {userInfo?.RecentLeagues?.map((league: any) => (
                            <TouchableOpacity
                                key={league.LeagueId}
                                onPress={() => router.push(`/leagues/${league.LeagueId}`)}
                                className="bg-neutral-900/30 border border-neutral-800/50 rounded-3xl p-5 flex-row items-center justify-between"
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className="h-12 w-12 bg-neutral-800 rounded-xl items-center justify-center">
                                        <Text className="text-white font-black italic">L{league.LeagueId}</Text>
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-lg font-black text-white uppercase italic tracking-tight" numberOfLines={1}>
                                            {league.LeagueName}
                                        </Text>
                                        <Text className="text-[9px] font-mono text-neutral-500 uppercase font-bold">
                                            Rank: #{league.PlayerRank} / {league.TotalPlayers} Players
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color="#525252" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}