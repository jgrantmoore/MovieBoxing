import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { X, UserPlus, ArrowRightLeft, Check } from 'lucide-react-native';
import { MovieCard } from './MovieCard';

interface TradeProps {
    visible: boolean;
    onClose: () => void;
    myTeam: any;
    otherTeam: any;
    startingSlots: number;
    totalSlots: number;
    handleTradeProposal: (
        ProposingTeamId: number,
        TargetTeamId: number,
        OfferedMovieId: number,
        RequestedMovieId: number,
        Incentive: number
    ) => Promise<void>;
}

export const TradeModal = ({
    visible,
    onClose,
    myTeam,
    otherTeam,
    startingSlots,
    totalSlots,
    handleTradeProposal
}: TradeProps) => {
    const [otherTeamSelection, setOtherTeamSelection] = useState<any | null>(null);
    const [myTeamSelection, setMyTeamSelection] = useState<any | null>(null);
    const [mode, setMode] = useState<'otherteam' | 'myteam' | 'confirm'>('otherteam');

    // Loading States
    const [isProcessing, setIsProcessing] = useState(false);


    const handleSlotPress = async (pick: any) => {
        if (isProcessing) return; // Prevent double-taps

        if (mode === 'otherteam') {
            setOtherTeamSelection(pick);
        } else {
            setMyTeamSelection(pick);
        }
    };

    const proposeTrade = async () => {
        if (!myTeamSelection || !otherTeamSelection) return;
        setIsProcessing(true);
        try {
            await handleTradeProposal(
                myTeam.TeamId,
                otherTeam.TeamId,
                myTeamSelection.MovieId,
                otherTeamSelection.MovieId,
                0 // No cash incentive for now
            );
            setIsProcessing(false);
            reset();
        } catch (error) {
            console.error("Trade proposal failed:", error);
            setIsProcessing(false);
        }
    }

    const reset = () => {
        if (isProcessing) return;
        setOtherTeamSelection(null);
        setMyTeamSelection(null);
        onClose();
    };

    const renderSlot = (team: any, slot: number) => {
        const pick = team?.Picks?.find((p: any) => p.OrderDrafted === slot);
        const isSelected = (mode === 'otherteam' ? otherTeamSelection : myTeamSelection) === pick;

        return (
            <TouchableOpacity
                key={slot + "tradingwith" + otherTeam.TeamId}
                onPress={() => handleSlotPress(pick)}
                activeOpacity={0.7}
                disabled={isProcessing}
                className={`w-[31%] mb-4 rounded-3xl overflow-hidden border-2 ${isSelected ? 'border-red-600 bg-red-600/10' : 'border-transparent'
                    } ${isProcessing ? 'opacity-50' : ''}`}
            >
                <MovieCard
                    movieId={pick?.MovieId || 0}
                    title={pick?.Title || "Open Slot"}
                    posterUrl={pick?.PosterUrl}
                    isBench={slot > startingSlots}
                    releaseDate={pick?.ReleaseDate}
                    boxOffice={pick?.BoxOffice || 0}
                    compact
                />
                {isSelected && (
                    <View className="absolute inset-0 items-center justify-center pointer-events-none">
                        <View className="bg-red-600 px-2 py-1 rounded shadow-lg">
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white font-black uppercase italic text-[10px]">
                                    {mode === 'otherteam' ? 'Receive' : 'Trade Away'}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-slate-950"
            >
                {/* Header */}
                <View className="p-6 pt-16 flex-row justify-between items-center border-b border-neutral-900 bg-slate-950">
                    <View>
                        <Text className="text-2xl font-black text-red-600 uppercase italic">Propose Trade</Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Proposing a trade with {otherTeam?.TeamName}</Text>
                    </View>
                    <TouchableOpacity onPress={reset} disabled={isProcessing} className="bg-neutral-900 p-2 rounded-full">
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
                    {/* Management Mode Toggle */}
                    <View className={`flex-row bg-neutral-900 rounded-2xl p-1 mb-6 ${isProcessing ? 'opacity-50' : ''}`}>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('otherteam') }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'otherteam' ? 'bg-red-600' : ''}`}
                        >
                            <ArrowRightLeft size={16} color={mode === 'otherteam' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[10px] max-w-[75%] font-black uppercase italic line-clamp-1 ${mode === 'otherteam' ? 'text-white' : 'text-neutral-500'}`}>{otherTeam?.TeamName}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('myteam') }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'myteam' ? 'bg-red-600' : ''}`}
                        >
                            <UserPlus size={16} color={mode === 'myteam' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[10px] font-black uppercase italic ${mode === 'myteam' ? 'text-white' : 'text-neutral-500'}`}>My Team</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('confirm') }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'confirm' ? 'bg-red-600' : ''}`}
                        >
                            <Check size={16} color={mode === 'confirm' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[10px] font-black uppercase italic ${mode === 'confirm' ? 'text-white' : 'text-neutral-500'}`}>Confirm</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Instruction Text */}
                    <Text className="text-neutral-500 font-bold uppercase text-[9px] mb-8 tracking-[0.2em] text-center">
                        {isProcessing ? "Processing Transaction..." :
                            mode === 'otherteam'
                                ? "Select a movie to receive in the trade"
                                : "Select a movie to trade away from your team"
                        }
                    </Text>

                    {/* Roster Sections */}
                    {mode !== 'confirm' && (
                        <>
                            <View className="mb-4 flex-row items-center">
                                <Text className="text-white font-black uppercase italic text-sm tracking-tighter">{mode == 'otherteam' ? otherTeam.Owner + "'s" : "Your"} Starting Lineup</Text>
                                <View className="flex-1 h-[1px] bg-neutral-800 ml-3" />
                            </View>
                            <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-4">
                                {Array.from({ length: startingSlots }).map((_, i) => renderSlot(mode == 'otherteam' ? otherTeam : myTeam, i + 1))}
                            </View>

                            <View className="mb-4 flex-row items-center">
                                <Text className="text-neutral-500 font-black uppercase italic text-sm tracking-tighter">{mode == 'otherteam' ? otherTeam.Owner + "'s" : "Your"} Bench</Text>
                                <View className="flex-1 h-[1px] bg-neutral-800 ml-3 opacity-30" />
                            </View>
                            <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-12">
                                {Array.from({ length: totalSlots - startingSlots }).map((_, i) => renderSlot(mode == 'otherteam' ? otherTeam : myTeam, startingSlots + i + 1))}
                            </View>
                        </>
                    )}

                    {mode === 'confirm' && (
                        <View className="p-6 bg-neutral-900 rounded-2xl">
                            <Text className="text-white text-xl font-black uppercase italic text-center mb-4">Confirm Trade Proposal</Text>
                            <Text className="text-neutral-500 font-black uppercase italic text-center mb-6">You are proposing the following trade:</Text>
                            <View className="flex-row items-center justify-center mb-6">
                                <View>
                                    <Text className="text-neutral-500 font-bold uppercase text-[9px] mb-2 tracking-[0.2em] text-center">You Trade</Text>
                                    <MovieCard
                                        movieId={myTeamSelection?.MovieId || 0}
                                        title={myTeamSelection?.Title || "Open Slot"}
                                        posterUrl={myTeamSelection?.PosterUrl}
                                        isBench={myTeamSelection?.slot > startingSlots}
                                        releaseDate={myTeamSelection?.ReleaseDate}
                                        boxOffice={myTeamSelection?.BoxOffice || 0}
                                        compact
                                    />
                                </View>
                                <View>
                                    <Text className="text-neutral-500 font-bold uppercase text-[9px] mb-2 tracking-[0.2em] text-center">You Receive</Text>
                                    <MovieCard
                                        movieId={otherTeamSelection?.MovieId || 0}
                                        title={otherTeamSelection?.Title || "Open Slot"}
                                        posterUrl={otherTeamSelection?.PosterUrl}
                                        isBench={otherTeamSelection?.slot > startingSlots}
                                        releaseDate={otherTeamSelection?.ReleaseDate}
                                        boxOffice={otherTeamSelection?.BoxOffice || 0}
                                        compact
                                    />
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={proposeTrade}
                                disabled={isProcessing || !myTeamSelection || !otherTeamSelection}
                                activeOpacity={0.8}
                                className={`mt-4 py-5 rounded-2xl flex-row items-center justify-center shadow-lg ${isProcessing ? 'bg-neutral-800' : 'bg-red-600 shadow-red-900/40'}`}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <ArrowRightLeft color="white" size={20} strokeWidth={3} />
                                        <Text className="text-white font-black uppercase italic text-lg ml-2">Propose Trade</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}



                    <View className="h-20" />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal >
    );
};