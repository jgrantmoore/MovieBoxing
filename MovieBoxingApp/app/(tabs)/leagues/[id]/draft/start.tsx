import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ActivityIndicator, Alert,
    TouchableOpacity as RNStandardTouch // For UI buttons
} from 'react-native';
import { GestureHandlerRootView, TouchableOpacity as GestureTouch } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Play, ChevronLeft, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { apiRequest } from '../../../../../src/api/client';

export default function DraftStart() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [league, setLeague] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        const fetchDraftInfo = async () => {
            try {
                const data = await apiRequest(`/leagues?id=${id}`);
                setLeague(data);
                const sorted = [...(data?.Teams || [])].sort((a, b) => a.DraftOrder - b.DraftOrder);
                setTeams(sorted);
            } catch (err) {
                Alert.alert("Error", "Could not load draft details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDraftInfo();
    }, [id]);

    const handleStartDraft = async () => {
        setStarting(true);
        const draftOrderPayload = teams.map((t, idx) => ({ teamId: t.TeamId, order: idx + 1 }));
        try {
            await apiRequest(`/drafts/start?id=${id}`, {
                method: 'POST',
                body: JSON.stringify({ leagueId: id, newOrder: draftOrderPayload })
            });
            router.replace(`/leagues/${id}/draft`);
        } catch (err: any) {
            Alert.alert("Draft Failed", err.message);
        } finally {
            setStarting(false);
        }
    };

    // MEMOIZED RENDER ITEM - Crucial for performance and preventing context loss
    const renderTeamItem = useCallback(({ item, drag, isActive }: RenderItemParams<any>) => {
        return (
            <ScaleDecorator>
                <GestureTouch
                    onPressIn={drag} // This triggers the moment they touch down
                    delayLongPress={0} // Removes the delay
                    activeOpacity={1}
                    disabled={!league?.isAdmin}
                    style={{
                        backgroundColor: isActive ? '#1e293b' : '#171717',
                        borderColor: isActive ? '#dc2626' : '#262626',
                        borderWidth: 1,
                        borderRadius: 16,
                        marginBottom: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <View className="w-8 h-8 rounded-full bg-black border border-neutral-700 items-center justify-center mr-4">
                        <Text className="text-white font-black italic">
                            {(teams.findIndex(t => t.TeamId === item.TeamId) + 1).toString().padStart(2, '0')}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-bold uppercase italic">{item.TeamName}</Text>
                        <Text className="text-neutral-500 text-[10px] font-mono">{item.Owner}</Text>
                    </View>
                    {league?.isAdmin && <GripVertical size={20} color={isActive ? "#dc2626" : "#404040"} />}
                </GestureTouch>
            </ScaleDecorator>
        );
    }, [teams, league?.isAdmin]);

    if (loading) return (
        <View className="flex-1 bg-slate-950 items-center justify-center">
            <ActivityIndicator color="#dc2626" />
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-slate-950">
                <Stack.Screen options={{
                    title: "DRAFT BRIEFING",
                    headerStyle: { backgroundColor: '#020617' },
                    headerLeft: () => (
                        <RNStandardTouch onPress={() => router.back()} className="p-2 -ml-2">
                            <ChevronLeft color="white" size={28} />
                        </RNStandardTouch>
                    )
                }} />

                <DraggableFlatList
                    data={teams}
                    onDragEnd={({ data }) => setTeams(data)}
                    keyExtractor={(item) => item.TeamId.toString()}
                    renderItem={renderTeamItem}
                    activationDistance={20} // Higher distance makes scrolling easier
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 }}
                    ListHeaderComponent={
                        <View className="mb-6">
                            <Text className="text-4xl font-black text-white uppercase italic text-center mb-2">Initialize Draft</Text>
                            <Text className="text-neutral-500 font-mono text-[10px] uppercase text-center mb-8">
                                {league?.LeagueName} • Long Press to Reorder
                            </Text>
                            {/* Stats row here... */}
                        </View>
                    }
                    ListFooterComponent={
                        league?.isAdmin && (
                            <RNStandardTouch onPress={handleStartDraft} disabled={starting} className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center mt-4">
                                {starting ? <ActivityIndicator color="white" /> : <><Play size={20} color="white" fill="white" /><Text className="text-white font-black uppercase italic text-lg ml-3">Commence Draft</Text></>}
                            </RNStandardTouch>
                        )
                    }
                />
            </View>
        </GestureHandlerRootView>
    );
}