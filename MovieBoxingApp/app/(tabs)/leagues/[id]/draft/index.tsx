import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, Modal, Alert, FlatList, Dimensions
} from 'react-native';
import { io, Socket } from "socket.io-client";
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
    Search, CheckCircle2, ChevronRight,
    ArrowRight, Film, Loader2
} from 'lucide-react-native';
import { apiRequest } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function DraftArena() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const socketRef = useRef<Socket | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const { session } = useAuth();

    const currentUserId = session?.user?.userId;

    const [movies, setMovies] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [leagueInfo, setLeagueInfo] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFinishedModalOpen, setIsFinishedModalOpen] = useState(false);

    // UI Feedback States
    const [processingPickId, setProcessingPickId] = useState<number | null>(null);
    const [confirmingPickId, setConfirmingPickId] = useState<number | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const CARD_WIDTH = SCREEN_WIDTH - 64; // Slightly smaller to show both side cards peeking
    const CARD_MARGIN = 12;

    const calculateGlobalPick = useCallback((round: number, draftOrder: number, totalTeams: number) => {
        const isEvenRound = round % 2 === 0;
        if (isEvenRound) {
            // Even Round: (Total Teams - Draft Order) + 1
            // Example: Round 2, Team 3 of 3 -> (2-1)*3 + (3-3+1) = Pick 4
            return (round - 1) * totalTeams + (totalTeams - draftOrder + 1);
        } else {
            // Odd Round: Standard order
            return (round - 1) * totalTeams + draftOrder;
        }
    }, []);

    const chronologicalPicks = useMemo(() => {
        if (!teams.length) return [];

        const totalTeams = teams.length;
        const all = teams.flatMap(team => {
            return (team.Picks || []).map((pick: any, index: number) => {
                const round = index + 1;
                const globalPickNum = calculateGlobalPick(round, team.DraftOrder, totalTeams);

                return {
                    ...pick,
                    teamName: team.TeamName,
                    ownerName: team.Owner,
                    posterUrl: pick.PosterUrl,
                    globalPickNum // We use this to sort
                };
            });
        });

        // Sort descending (highest global pick number first)
        return all.sort((a, b) => b.globalPickNum - a.globalPickNum);
    }, [teams, calculateGlobalPick]);

    const sortedTeams = useMemo(() => {
        if (!teams.length || !currentUserId) return teams;

        return [...teams].sort((a, b) => {
            if (String(a.OwnerUserId) === String(currentUserId)) return -1;
            if (String(b.OwnerUserId) === String(currentUserId)) return 1;
            return 0;
        });
    }, [teams, currentUserId]);

    const fetchData = useCallback(async () => {
        try {
            // Use a cache-buster 't' to ensure fresh data on every update
            const data = await apiRequest(`/leagues?id=${id}&t=${Date.now()}`);
            setTeams(data.Teams || []);
            setLeagueInfo(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const getDraftOrderAtPick = useCallback((pickNum: number) => {
        if (!teams.length) return null;
        const totalTeams = teams.length;
        const round = Math.ceil(pickNum / totalTeams);
        const isEvenRound = round % 2 === 0;
        const relativePos = (pickNum - 1) % totalTeams;
        return isEvenRound ? (totalTeams - relativePos) : (relativePos + 1);
    }, [teams.length]);

    const draftState = useMemo(() => {
        if (!leagueInfo || !teams.length) return null;
        const currentPick = leagueInfo.DraftUsersTurn || 1;
        const rules = leagueInfo.Rules || { Starting: 5, Bench: 2 };
        const totalPicksInLeague = ((rules.Starting || 0) + (rules.Bench || 0)) * teams.length;

        const currentOrderNeeded = getDraftOrderAtPick(currentPick);
        const activeTeam = teams.find(t => t.DraftOrder === currentOrderNeeded);
        const isMyTurn = String(activeTeam?.OwnerUserId) === String(currentUserId);

        const allPicks = teams.flatMap(t => (t.Picks || []).map((p: any) => ({
            ...p,
            TeamName: t.TeamName,
            tmdbReference: p.TMDBId
        })));

        return {
            activeTeam,
            isMyTurn,
            currentRound: Math.ceil(currentPick / teams.length),
            allPicks,
            totalPicksInLeague,
            isLastPick: currentPick === totalPicksInLeague
        };
    }, [leagueInfo, teams, getDraftOrderAtPick, currentUserId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 2. Socket Connection (Real-time updates)
    useEffect(() => {
        const socketUrl = "https://api.movieboxing.com";
        socketRef.current = io(socketUrl, {
            transports: ["websocket"],
            forceNew: true
        });

        socketRef.current.on("connect", () => {
            socketRef.current?.emit("joinDraft", id);
        });

        socketRef.current.on("draftUpdate", fetchData);

        return () => {
            socketRef.current?.disconnect();
        };
    }, [id, fetchData]);

    useEffect(() => {
        if (!debouncedSearch || !leagueInfo) return setMovies([]);
        apiRequest(`/movies/search?q=${encodeURIComponent(debouncedSearch)}`, {
            method: 'POST',
            body: JSON.stringify({ StartDate: leagueInfo.StartDate, EndDate: leagueInfo.EndDate })
        }).then(setMovies);
    }, [debouncedSearch, leagueInfo]);

    useEffect(() => {
        if (!leagueInfo?.Rules || !teams.length) return;

        const slotsPerTeam = (leagueInfo.Rules.Starting || 0) + (leagueInfo.Rules.Bench || 0);
        const totalPossiblePicks = slotsPerTeam * teams.length;

        // Count how many picks have actually been made across all teams
        const actualPicksCount = teams.reduce((acc, team) => acc + (team.Picks?.length || 0), 0);

        if (actualPicksCount >= totalPossiblePicks && totalPossiblePicks > 0) {
            setIsFinishedModalOpen(true);
        }
    }, [teams, leagueInfo]);

    const handleDraftMovie = async (movie: any) => {
        if (confirmingPickId !== movie.id) {
            setConfirmingPickId(movie.id);
            setTimeout(() => setConfirmingPickId(null), 3000); // Reset after 3s
            return;
        }

        setProcessingPickId(movie.id);
        setConfirmingPickId(null);

        try {
            await apiRequest('/drafts/pick', {
                method: 'POST',
                body: JSON.stringify({ TeamId: draftState?.activeTeam?.TeamId, tmdbId: movie.id })
            });
            setSearchTerm("");
        } catch (err: any) {
            Alert.alert("Draft Error", err.message);
        } finally {
            setProcessingPickId(null);
        }
    };

    const renderRosterPage = ({ item: team }: { item: any }) => (
        <View
            style={{
                width: CARD_WIDTH,
                marginHorizontal: CARD_MARGIN / 2
            }}
            className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-[2.5rem]"
        >
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xs font-black uppercase text-neutral-500">{team.TeamName}</Text>
                {team.OwnerUserId === currentUserId && (
                    <Text className="text-[8px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-black uppercase">You</Text>
                )}
            </View>

            {Array.from({ length: (leagueInfo?.Rules?.Starting || 5) + (leagueInfo?.Rules?.Bench || 2) }).map((_, idx) => {
                const slot = idx + 1;
                const pick = team.Picks?.find((p: any) => Number(p.OrderDrafted) === slot);
                const isBench = slot > (leagueInfo?.Rules?.Starting || 5);

                return (
                    <View key={idx} className={`flex-row items-center p-3 rounded-xl border mb-2 ${pick ? 'bg-black/40 border-neutral-800' : 'border-neutral-900 border-dashed opacity-40'}`}>
                        <Text className="text-[9px] font-mono text-neutral-600 w-6">{slot}</Text>
                        <View className="flex-1">
                            <Text className={`text-[11px] font-black uppercase italic ${pick ? 'text-white' : 'text-neutral-700'}`}>
                                {pick ? (pick.Title || pick.MovieTitle) : `Empty ${isBench ? 'Bench' : 'Slot'}`}
                            </Text>
                        </View>
                        {pick && <Film color="#404040" size={12} />}
                    </View>
                );
            })}
        </View>
    );

    if (loading) return <View className="flex-1 bg-slate-950 items-center justify-center"><ActivityIndicator color="#dc2626" /></View>;

    return (
        <View className="flex-1 bg-slate-950">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Turn Indicator Header (Keep this outside the ScrollView) */}
            <View className={`pt-12 pb-4 px-6 shadow-2xl ${draftState?.isMyTurn ? 'bg-green-600' : 'bg-red-600'}`}>
                <View className="flex-row items-center">
                    <View className="bg-black/20 p-2 px-3 rounded-lg border border-white/10 items-center mr-4">
                        <Text className="text-[8px] font-black text-white uppercase tracking-widest">Round</Text>
                        <Text className="text-xl font-black italic text-white">{draftState?.currentRound}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] font-black uppercase text-white/80">{draftState?.isMyTurn ? "★ YOUR TURN" : "ON THE CLOCK"}</Text>
                        <Text className="text-2xl font-black uppercase italic tracking-tighter text-white">{draftState?.activeTeam?.TeamName}</Text>
                    </View>
                </View>
            </View>

            {/* SINGLE SCROLLVIEW WRAPPER */}
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
            >

                {/* 1. Chronological Pick Scroller */}
                {chronologicalPicks.length > 0 && (
                    <View className="py-4 border-b border-neutral-900">
                        <Text className="px-6 text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">
                            Latest Transactions
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
                        >
                            {chronologicalPicks.map((pick, idx) => (
                                <View
                                    key={`${pick.TMDBId}-${idx}`}
                                    className="flex-row bg-neutral-900 border border-neutral-800 rounded-2xl p-2 w-64 items-center"
                                >
                                    <View className="h-14 w-10 bg-neutral-800 rounded-lg overflow-hidden mr-3">
                                        {pick.posterUrl ? (
                                            <Image
                                                source={{ uri: `https://image.tmdb.org/t/p/w200${pick.posterUrl}` }}
                                                className="h-full w-full"
                                            />
                                        ) : (
                                            <View className="flex-1 items-center justify-center">
                                                <Film color="#404040" size={16} />
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-black uppercase italic text-[10px]" numberOfLines={1}>
                                            {pick.Title || pick.MovieTitle}
                                        </Text>
                                        <Text className="text-red-600 font-black uppercase text-[8px]" numberOfLines={1}>
                                            {pick.teamName}
                                        </Text>
                                        <Text className="text-neutral-500 font-mono text-[7px] uppercase" numberOfLines={1}>
                                            @{pick.ownerName}
                                        </Text>
                                    </View>
                                    <View className="bg-black/40 px-2 py-1 rounded-md ml-1">
                                        <Text className="text-white font-mono text-[8px]">#{pick.OrderDrafted}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* 2. Search & Movie List */}
                <View className="p-6">
                    <TextInput
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="SEARCH MOVIES..."
                        placeholderTextColor="#737373"
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl py-4 px-12 text-white font-black italic uppercase mb-6"
                    />

                    {movies.map((movie) => {
                        const isTaken = draftState?.allPicks.some(p => String(p.tmdbReference) === String(movie.id));
                        const isProcessing = processingPickId === movie.id;
                        const isConfirming = confirmingPickId === movie.id;

                        return (
                            <View key={movie.id} className={`flex-row items-center p-4 rounded-3xl border mb-3 ${isTaken ? 'opacity-40 bg-neutral-950' : 'bg-neutral-900 border-neutral-800'}`}>
                                <View className="h-16 w-12 bg-neutral-800 rounded mr-4 overflow-hidden">
                                    {movie.poster_path && <Image source={{ uri: `https://image.tmdb.org/t/p/w200${movie.poster_path}` }} className="h-full w-full" />}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-black uppercase italic text-sm" numberOfLines={1}>{movie.title}</Text>
                                    <Text className="text-[10px] font-mono text-neutral-500">{movie.release_date}</Text>
                                </View>

                                <TouchableOpacity
                                    disabled={isTaken || !draftState?.isMyTurn || isProcessing}
                                    onPress={() => handleDraftMovie(movie)}
                                    className={`rounded-2xl items-center justify-center ${isConfirming ? 'bg-green-500 h-12 w-28 ' : isTaken ? 'bg-transparent h-12 w-12' : 'bg-white h-12 w-12 '}`}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color="black" size="small" />
                                    ) : isConfirming ? (
                                        <View className="flex-row items-center bg-green-500 px-2 py-1 rounded-full">
                                            <Text className="text-[8px] font-black uppercase text-black bg-green-500 px-1 rounded-full">CONFIRM</Text>
                                            <CheckCircle2 color="black" size={24} />
                                        </View>
                                    ) : (
                                        <ChevronRight color="black" size={24} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                {/* 3. HORIZONTAL SWIPE ROSTERS */}
                <View className="mt-4">
                    <FlatList
                        ref={flatListRef}
                        data={sortedTeams}
                        horizontal
                        pagingEnabled={false}
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.TeamId.toString()}
                        renderItem={renderRosterPage}
                        contentContainerStyle={{
                            paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - (CARD_MARGIN / 2)
                        }}
                        snapToInterval={CARD_WIDTH + CARD_MARGIN}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        scrollEnabled={true}
                        nestedScrollEnabled={true} // Crucial for Android since it's inside a ScrollView
                    />
                    <Text className="text-[8px] text-neutral-600 font-black uppercase text-center mt-6 tracking-widest">
                        Swipe to view league rosters
                    </Text>
                </View>
            </ScrollView>

            {/* Completion Modal */}
            <Modal visible={isFinishedModalOpen} transparent animationType="fade">
                <View className="flex-1 bg-black/80 items-center justify-center p-8">
                    <View className="bg-slate-900 border-2 border-green-500 w-full rounded-[3rem] p-10 items-center shadow-2xl">
                        <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-6">
                            <CheckCircle2 color="black" size={40} />
                        </View>
                        <Text className="text-3xl font-black text-white uppercase italic text-center mb-2">Draft Finished</Text>
                        <Text className="text-neutral-400 text-center mb-8">The box office battle begins now.</Text>
                        <TouchableOpacity
                            onPress={() => router.replace(`/leagues/${id}`)}
                            className="bg-white w-full py-5 rounded-2xl items-center flex-row justify-center"
                        >
                            <Text className="text-black font-black uppercase italic mr-2">Return Home</Text>
                            <ArrowRight color="black" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}