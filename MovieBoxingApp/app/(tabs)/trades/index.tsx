import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Check, X, ArrowRightLeft, Clock, ShieldAlert } from 'lucide-react-native';
import { apiRequest } from '@/src/api/client';

export default function TradeCenter() {
    const { session, loading: authLoading } = useAuth();
    const router = useRouter();

    const [trades, setTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchTrades = async (showRefresher = false) => {
        if (showRefresher) setRefreshing(true);
        try {
            const data = await apiRequest<any[]>('/trades/pending');
            setTrades(data || []);
        } catch (err) {
            console.error("Fetch Trades Error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatCurrency = (rev: number) => {
        if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(3)}B`;
        return `$${(rev / 1000000).toFixed(1)}M`;
    };

    // Pull-to-refresh handler
    const onRefresh = useCallback(() => {
        fetchTrades(true);
    }, []);

    useEffect(() => {
        if (session?.user) fetchTrades();
    }, [session]);

    const handleTradeAction = async (tradeId: number, action: 'accept' | 'deny') => {
        setProcessingId(tradeId);
        try {
            await apiRequest(`/trades/${action}`, {
                method: 'POST',
                body: JSON.stringify({ TradeId: tradeId })
            });

            Alert.alert("Success", action === 'accept' ? "Trade finalized!" : "Trade declined.");
            fetchTrades(); // Refresh list after action
        } catch (err: any) {
            Alert.alert("Error", err.message || "Action failed.");
        } finally {
            setProcessingId(null);
        }
    };

    if (authLoading || loading) {
        return (
            <View className="flex-1 bg-slate-950 justify-center items-center">
                <ActivityIndicator color="#dc2626" />
            </View>
        );
    }

    if (!session?.user) return null;

    const MY_USER_ID = session.user.userId;

    return (
        <View className="flex-1 bg-slate-950">
            {/* Header */}
            <View className="px-6 pt-12 pb-6 bg-slate-900/30">
                <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                    TRADE <Text className="text-red-600">CENTER</Text>
                </Text>
                <Text className="text-neutral-500 font-mono uppercase tracking-widest text-[12px] mt-2">
                    {trades.length} Pending Trades
                </Text>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-6"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#dc2626" // Red spinner for iOS
                        colors={["#dc2626"]} // Red spinner for Android
                    />
                }
            >
                {trades.length === 0 ? (
                    <View className="mt-20 items-center opacity-20">
                        <ArrowRightLeft size={64} color="white" />
                        <Text className="text-white font-black uppercase italic mt-4">No Pending Trades</Text>
                    </View>
                ) : (
                    trades.map((trade) => {
                        const isIncoming = trade.TargetOwnerUserId === Number(MY_USER_ID);
                        const isProcessing = processingId === trade.TradeId;

                        return (
                            <View
                                key={trade.TradeId}
                                className="bg-neutral-900/50 border border-neutral-800 rounded-[2rem] p-5 mb-6 shadow-xl"
                            >
                                <TouchableOpacity
                                    onPress={() => router.push(`/leagues/${trade.LeagueId}`)}
                                >
                                    {/* League Name */}
                                    <View className="">
                                        <Text className="text-white text-xl uppercase font-black italic uppercase mb-1">
                                            {trade.LeagueName}
                                        </Text>
                                    </View>
                                    {/* Direction Header */}
                                    <View className="flex-row items-center mb-4">
                                        <View className={`px-2 py-1 rounded-md ${isIncoming ? 'bg-blue-600/20' : 'bg-orange-600/20'}`}>
                                            <Text className={`text-[8px] font-black uppercase italic ${isIncoming ? 'text-blue-500' : 'text-orange-500'}`}>
                                                {isIncoming ? 'Incoming Trade' : 'Outgoing Proposal'}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center ml-auto">
                                            <Clock size={10} color="#737373" />
                                            <Text className="text-neutral-500 text-[10px] font-mono ml-1 uppercase">Pending</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* The Swap Display */}
                                <View className={`${isIncoming ? 'flex-row-reverse' : 'flex-row'} items-center justify-between`}>
                                    {/* Offered */}
                                    <View className="items-center flex-1">
                                        <View className="w-16 h-24 bg-black rounded-lg overflow-hidden border border-neutral-800 mb-2">
                                            <Image
                                                source={{ uri: `https://image.tmdb.org/t/p/w200${trade.OfferedPoster}` }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <Text className="text-white text-[10px] font-black uppercase italic text-center" numberOfLines={1}>
                                            {trade.OfferedMovieTitle}
                                        </Text>
                                        <Text className="text-neutral-500 text-[8px] uppercase font-bold mt-1">{trade.ProposingTeamName}</Text>
                                    </View>

                                    <ArrowRightLeft size={20} color="#dc2626" className="mx-4" />

                                    {/* Requested */}
                                    <View className="items-center flex-1">
                                        <View className="w-16 h-24 bg-black rounded-lg overflow-hidden border border-neutral-800 mb-2">
                                            <Image
                                                source={{ uri: `https://image.tmdb.org/t/p/w200${trade.RequestedPoster}` }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <Text className="text-white text-[10px] font-black uppercase italic text-center" numberOfLines={1}>
                                            {trade.RequestedMovieTitle}
                                        </Text>
                                        <Text className="text-neutral-500 text-[8px] uppercase font-bold mt-1">{trade.TargetTeamName}</Text>
                                    </View>
                                </View>

                                {/* Incentives / Notes */}

                                {trade.Incentive && (
                                    <View className="mt-6 bg-red-600/5 border-l-2 border-red-600 p-4 rounded-r-2xl">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-red-500 text-[10px] font-black uppercase tracking-widest italic">
                                                Trade Incentive
                                            </Text>
                                        </View>
                                        <View className="flex-row items-baseline">
                                            <Text className="text-white text-3xl font-black italic tracking-tighter">
                                                +{formatCurrency(trade.Incentive)}
                                            </Text>
                                            <Text className="text-neutral-500 text-[10px] font-bold uppercase ml-2 italic">
                                                In Box Office Revenue
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Actions */}
                                <View className="flex-row gap-x-3 mt-6">
                                    {isIncoming ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => handleTradeAction(trade.TradeId, 'deny')}
                                                disabled={isProcessing}
                                                className="flex-1 flex-row items-center justify-center bg-neutral-800 py-3 rounded-xl border border-neutral-700"
                                            >
                                                <X size={16} color="white" />
                                                <Text className="text-white font-black uppercase italic text-xs ml-2">Decline</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleTradeAction(trade.TradeId, 'accept')}
                                                disabled={isProcessing}
                                                className="flex-[2] flex-row items-center justify-center bg-red-600 py-3 rounded-xl shadow-lg"
                                            >
                                                {isProcessing ? <ActivityIndicator size="small" color="white" /> : (
                                                    <>
                                                        <Check size={16} color="white" />
                                                        <Text className="text-white font-black uppercase italic text-xs ml-2">Accept Trade</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleTradeAction(trade.TradeId, 'deny')}
                                            disabled={isProcessing}
                                            className="flex-1 flex-row items-center justify-center bg-neutral-800/50 py-3 rounded-xl border border-neutral-700"
                                        >
                                            <ShieldAlert size={14} color="#737373" />
                                            <Text className="text-neutral-400 font-black uppercase italic text-xs ml-2">Withdraw Offer</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
}