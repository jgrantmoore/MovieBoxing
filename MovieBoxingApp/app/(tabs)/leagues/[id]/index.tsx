import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ArrowLeft, Trophy, Armchair, Users, LayoutGrid, ListOrdered, Medal, Settings, Pencil, Trash2, Calendar, ChevronRight } from 'lucide-react-native';
import { apiRequest } from '../../../../src/api/client';
import { MovieCard } from '../../../../src/components/MovieCard';
import { FrontOfficeModal } from '../../../../src/components/FrontOfficeModal';
import { LeagueData, LeagueTeam, MoviePick } from '../../../../src/types/league';
import { useNavigation } from '@react-navigation/native';

export default function LeagueDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();

    // Data States
    const [leagueInfo, setLeagueInfo] = useState<LeagueData | null>(null);
    const [teams, setTeams] = useState<LeagueTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'teams' | 'release' | 'leaderboard'>('teams');

    // UI States
    const [openBench, setOpenBench] = useState<Set<string>>(new Set());
    const [isFrontOfficeOpen, setIsFrontOfficeOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchLeagueData();
    }, [id]);

    const fetchLeagueData = async () => {
        try {
            const data = await apiRequest<LeagueData>(`/leagues?id=${id}`);
            setLeagueInfo(data);
            setTeams(data.Teams || []);
            console.log("League End Date: " + leagueInfo?.EndDate);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const userTeam = useMemo(() => teams.find(t => t.OwnerUserId === 1), [teams]);

    const handleSwapAction = async (slot1: number, slot2: number) => {
        if (!userTeam) return;

        setIsSubmitting(true);
        try {
            await apiRequest(`/teams/swap`, {
                method: 'POST',
                body: JSON.stringify({
                    TeamId: userTeam.TeamId,
                    Slot1: slot1,
                    Slot2: slot2
                })
            });

            await fetchLeagueData();
            setIsFrontOfficeOpen(false);
            Alert.alert("Success", "Roster reshuffled!");

        } catch (err: any) {
            const errorMessage = err.message || "An unexpected error occurred.";
            Alert.alert("Ref Stopped the Fight", errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmLeaveLeague = () => {
        Alert.alert(
            "Resign Position?",
            "Are you sure you want to leave this league? Your roster will be forfeited.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave League",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiRequest(`/leagues/leave`, { method: 'POST', body: JSON.stringify({ id }) });
                            router.replace('/leagues');
                        } catch (err) {
                            Alert.alert("Error", "Could not leave league.");
                        }
                    }
                }
            ]
        );
    };

    const toggleBench = (teamName: string) => {
        const next = new Set(openBench);
        next.has(teamName) ? next.delete(teamName) : next.add(teamName);
        setOpenBench(next);
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

            <ScrollView className="flex-1">
                <View className="px-6 py-8">

                    {/* GLOBAL BACK BUTTON */}
                    <TouchableOpacity
                        onPress={handleBack}
                        className="mb-6 w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-full items-center justify-center active:bg-red-600"
                    >
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-8">
                        <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                                <View className={`px-2 py-1 rounded-md mr-3 ${leagueInfo.isPrivate ? 'bg-amber-600/20 border border-amber-600/50' : 'bg-green-600/20 border border-green-600/50'}`}>
                                    <Text className="text-[10px] font-black text-white uppercase italic">
                                        {leagueInfo.isPrivate ? 'Private' : 'Public'}
                                    </Text>
                                </View>
                                <Text className="text-neutral-500 font-mono text-xs">{teams.length} Teams</Text>
                            </View>
                            <Text className="text-4xl w-80 font-black text-white uppercase italic tracking-tighter">
                                {leagueInfo.LeagueName}
                            </Text>
                        </View>

                        <View className="flex-row gap-2">
                            {leagueInfo.isAdmin && (
                                <TouchableOpacity
                                    onPress={() => router.push(`/leagues/${id}/settings`)}
                                    className="bg-neutral-800 p-3 rounded-xl border border-neutral-700 active:bg-red-600"
                                >
                                    <Settings size={20} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Rules Grid */}
                    <View className="flex-row flex-wrap bg-neutral-900/30 border border-neutral-800 rounded-3xl p-4 mb-8">
                        <RuleItem icon={<Trophy size={16} color="#dc2626" />} label="Starters" value={STARTING_SLOTS} />
                        <RuleItem icon={<Armchair size={16} color="#dc2626" />} label="Bench" value={BENCH_SLOTS} />
                        <RuleItem icon={<Users size={16} color="#dc2626" />} label="Commissioner" value={leagueInfo.AdminName} />
                        <RuleItem
                            icon={<Calendar size={16} color="#dc2626" />}
                            label="Ends"
                            value={(() => {
                                const d = new Date(leagueInfo.EndDate);
                                const month = d.getUTCMonth();
                                const day = d.getUTCDate();
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                return `${months[month]} ${day}`;
                            })()}
                        />
                    </View>

                    {/* Tabs */}
                    <View className="flex-row bg-neutral-900 rounded-2xl p-1 mb-4">
                        <TabBtn active={activeTab === 'teams'} label="Teams" icon={<LayoutGrid size={16} color={activeTab === 'teams' ? 'white' : '#737373'} />} onPress={() => setActiveTab('teams')} />
                        <TabBtn active={activeTab === 'release'} label="Schedule" icon={<ListOrdered size={16} color={activeTab === 'release' ? 'white' : '#737373'} />} onPress={() => setActiveTab('release')} />
                        <TabBtn active={activeTab === 'leaderboard'} label="Stats" icon={<Medal size={16} color={activeTab === 'leaderboard' ? 'white' : '#737373'} />} onPress={() => setActiveTab('leaderboard')} />
                    </View>

                    {/* Draft Actions Row */}
                    <View className="mb-8">
                        {/* Admin: Start Draft Button (Before Draft Begins) */}
                        {leagueInfo.isAdmin && !leagueInfo.HasDrafted && !leagueInfo.IsDrafting && (
                            <TouchableOpacity
                                onPress={() => router.push(`/leagues/${id}/draft/start`)}
                                className="bg-neutral-900 border border-neutral-800 rounded-2xl py-4 flex-row items-center justify-center active:bg-neutral-800"
                            >
                                <Calendar size={18} color="#dc2626" />
                                <Text className="ml-3 text-white font-black uppercase italic tracking-widest text-xs">
                                    Setup Draft Room
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Everyone: Live Draft Button (When Drafting is Active) */}
                        {leagueInfo.IsDrafting && (
                            <TouchableOpacity
                                onPress={() => router.push(`/leagues/${id}/draft`)}
                                className="bg-red-600 rounded-2xl py-5 flex-row items-center justify-center shadow-lg shadow-red-600/40 border-b-4 border-red-800"
                            >
                                <View className="bg-white/20 p-1 rounded-full mr-3">
                                    <Trophy size={20} color="white" />
                                </View>
                                <View>
                                    <Text className="text-white font-black uppercase italic tracking-tighter text-lg leading-none">
                                        Enter Draft Arena
                                    </Text>
                                    <Text className="text-white/80 font-mono text-[8px] uppercase tracking-[0.2em] mt-1">
                                        Live Session in Progress
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="white" strokeWidth={3} className="ml-4" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Teams View */}
                    {activeTab === 'teams' && (
                        <View>
                            {teams.map((team) => {
                                const isUser = team.OwnerUserId === 1;
                                const showFull = openBench.has(team.TeamName);

                                const totalBoxOffice = (team.Picks || []).reduce((sum: number, p: MoviePick) =>
                                    p.OrderDrafted <= STARTING_SLOTS ? sum + (p.BoxOffice || 0) : sum, 0
                                );

                                return (
                                    <View key={team.TeamId} className={`bg-neutral-900/50 border rounded-[2.5rem] p-6 mb-8 ${isUser ? 'border-red-600/50' : 'border-neutral-800'}`}>
                                        <View className="flex-row justify-between items-start mb-6">
                                            <View className="flex-1">
                                                <View className="flex-row items-center">
                                                    <Text className="text-2xl font-black text-red-600 uppercase italic leading-none">{team.TeamName}</Text>
                                                    {isUser && <View className="ml-2 bg-red-600 rounded-full px-2"><Text className="text-[8px] text-white font-bold uppercase">You</Text></View>}
                                                </View>
                                                <Text className="text-neutral-500 font-mono text-[10px] mt-1">Manager: {team.Owner}</Text>

                                                {isUser && (
                                                    <View className="flex-row gap-2 mt-4">
                                                        <TouchableOpacity
                                                            disabled={isSubmitting}
                                                            onPress={() => setIsFrontOfficeOpen(true)}
                                                            className="bg-red-600 px-4 py-2 rounded-xl flex-row items-center"
                                                        >
                                                            {isSubmitting ? <ActivityIndicator size="small" color="white" /> : (
                                                                <>
                                                                    <Pencil size={14} color="white" />
                                                                    <Text className="text-white text-[10px] font-black uppercase italic ml-2">Front Office</Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={confirmLeaveLeague}
                                                            className="bg-neutral-800 px-3 py-2 rounded-xl border border-neutral-700"
                                                        >
                                                            <Trash2 size={14} color="#737373" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-xl font-mono font-black text-white">${(totalBoxOffice / 1000000).toFixed(1)}M</Text>
                                                <TouchableOpacity onPress={() => toggleBench(team.TeamName)}>
                                                    <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                                                        {showFull ? 'Hide Bench' : 'Show Bench'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View className="flex-row px-4">
                                                {Array.from({ length: showFull ? TOTAL_SLOTS : STARTING_SLOTS }).map((_, idx) => {
                                                    const slot = idx + 1;
                                                    const pick = team.Picks?.find((p: MoviePick) => p.OrderDrafted === slot);
                                                    return (
                                                        <View key={slot} className="mr-2">
                                                            <MovieCard
                                                                movieId={pick?.MovieId || 0}
                                                                title={pick?.Title || "Open Slot"}
                                                                posterUrl={pick?.PosterUrl}
                                                                boxOffice={pick?.BoxOffice}
                                                                isBench={slot > STARTING_SLOTS}
                                                            />
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            {userTeam && (
                <FrontOfficeModal
                    visible={isFrontOfficeOpen}
                    onClose={() => setIsFrontOfficeOpen(false)}
                    team={userTeam}
                    startingSlots={STARTING_SLOTS}
                    totalSlots={TOTAL_SLOTS}
                    onSwap={handleSwapAction}
                    searchMovies={async (q) => {
                        return await apiRequest<MoviePick[]>(`/movies/search?q=${q}`, {
                            method: 'POST',
                            body: JSON.stringify({
                                StartDate: leagueInfo.StartDate,
                                EndDate: leagueInfo.EndDate
                            })
                        });
                    }}
                />
            )}
        </View>
    );
}

// --- Helper Components with Prop Typing ---

interface RuleItemProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}

const RuleItem = ({ icon, label, value }: RuleItemProps) => (
    <View className="w-1/2 flex-row items-center p-2">
        {icon}
        <View className="ml-2">
            <Text className="text-[8px] uppercase font-bold text-neutral-500">{label}</Text>
            <Text className="text-white font-black italic text-xs uppercase">{value}</Text>
        </View>
    </View>
);

interface TabBtnProps {
    active: boolean;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
}

const TabBtn = ({ active, label, icon, onPress }: TabBtnProps) => (
    <TouchableOpacity
        onPress={onPress}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${active ? 'bg-red-600' : ''}`}
    >
        {icon}
        <Text className={`ml-2 text-[10px] font-black uppercase italic ${active ? 'text-white' : 'text-neutral-500'}`}>
            {label}
        </Text>
    </TouchableOpacity>
);