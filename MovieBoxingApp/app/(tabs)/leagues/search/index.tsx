import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Search, Users, Trophy, ArrowRight, Lock, LockOpen, ChevronLeft } from 'lucide-react-native';
import { apiRequest } from '../../../../src/api/client'; // Your existing helper

export default function LeagueSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (query.trim().length < 2) return;
        setLoading(true);
        try {
            const data = await apiRequest(`/leagues/search?q=${query}`);
            setLeagues(data);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.length > 2) handleSearch();
            else if (query.length === 0) setLeagues([]);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{
                headerTitle: "",
                headerStyle: { backgroundColor: '#020617' },
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center -ml-2"
                    >
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView
                className="flex-1 px-6"
                stickyHeaderIndices={[1]}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="py-8">
                    <Text className="text-5xl font-black text-white uppercase italic tracking-tighter">
                        Find Your <Text className="text-red-600">Arena</Text>
                    </Text>
                    <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">
                        Search for open leagues or join a private one
                    </Text>
                </View>

                {/* Search Bar - Sticky */}
                <View className="bg-slate-950 py-4">
                    <View className="relative flex-row items-center bg-black border border-neutral-800 rounded-2xl px-5 py-4">
                        <Search className="text-neutral-500" size={20} />
                        <TextInput
                            placeholder="Search by league name..."
                            placeholderTextColor="#404040"
                            className="flex-1 ml-3 text-white text-lg font-bold uppercase italic tracking-tight"
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        {loading && <ActivityIndicator color="#dc2626" size="small" />}
                    </View>
                </View>

                {/* Results List */}
                <View className="py-6">
                    {leagues.length > 0 ? (
                        leagues.map((league) => (
                            <View
                                key={league.LeagueId}
                                className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2rem] mb-6"
                            >
                                <View className="mb-4">
                                    <Text className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
                                        {league.LeagueName}
                                    </Text>

                                    <View className="flex-row flex-wrap gap-4">
                                        <View className="flex-row items-center">
                                            <Users size={12} color="#dc2626" />
                                            <Text className="text-neutral-400 font-mono text-[10px] uppercase ml-1.5">
                                                {league.TeamCount} Team{league.TeamCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Trophy size={12} color="#dc2626" />
                                            <Text className="text-neutral-400 font-mono text-[10px] uppercase ml-1.5">
                                                {league.StartingNumber} Starters
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            {league.isPrivate ? (
                                                <>
                                                    <Lock size={12} color="#dc2626" />
                                                    <Text className="text-neutral-400 font-mono text-[10px] uppercase ml-1.5">Private</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <LockOpen size={12} color="#22c55e" />
                                                    <Text className="text-neutral-400 font-mono text-[10px] uppercase ml-1.5">Public</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={() => router.push(`/leagues/${league.LeagueId}`)}
                                    className="w-full bg-white py-4 rounded-xl flex-row items-center justify-center"
                                >
                                    <Text className="text-black font-black uppercase italic tracking-tighter mr-2">
                                        View League
                                    </Text>
                                    <ArrowRight size={18} color="black" strokeWidth={3} />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : query.length > 2 && !loading ? (
                        <View className="py-20 items-center justify-center border-2 border-dashed border-neutral-900 rounded-[2rem]">
                            <Text className="text-neutral-500 font-bold uppercase italic tracking-widest text-center px-6">
                                No arenas found matching "{query}"
                            </Text>
                        </View>
                    ) : (
                        <View className="py-20 items-center justify-center">
                            <Text className="text-neutral-700 font-black text-6xl uppercase italic tracking-tighter opacity-10 text-center">
                                Ready to{"\n"}Fight?
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}