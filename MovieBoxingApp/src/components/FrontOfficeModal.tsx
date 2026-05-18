import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    TextInput, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { X, Search, ArrowLeftRight, UserPlus, Pencil } from 'lucide-react-native';
import { MovieCard } from './MovieCard';
import { apiRequest } from '../api/client';
import { useRouter } from 'expo-router';

interface FrontOfficeProps {
    visible: boolean;
    onClose: () => void;
    onUpdatedClose: () => void;
    team: any;
    startingSlots: number;
    totalSlots: number;
    onSwap: (slot1: number, slot2: number) => Promise<void>;
    searchMovies: (query: string) => Promise<any[]>;
}

export const FrontOfficeModal = ({
    visible,
    onClose,
    onUpdatedClose,
    team,
    startingSlots,
    totalSlots,
    onSwap,
    searchMovies
}: FrontOfficeProps) => {
    const [swapSelection, setSwapSelection] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [mode, setMode] = useState<'swap' | 'pickup' | 'edit'>('swap');

    const router = useRouter();

    // Loading States
    const [searching, setSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        TeamName: team?.TeamName || "",
        TeamId: team?.TeamId || 0,
    });

    const handleSearch = async (text: string) => {
        setSearchTerm(text);
        if (text.length > 2) {
            setSearching(true);
            try {
                const results = await searchMovies(text);
                setSearchResults(results);
            } finally {
                setSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSlotPress = async (slot: number) => {
        if (isProcessing) return; // Prevent double-taps

        if (mode === 'swap') {
            if (swapSelection === null) {
                setSwapSelection(slot);
            } else if (swapSelection === slot) {
                setSwapSelection(null);
            } else {
                setIsProcessing(true);
                try {
                    await onSwap(swapSelection, slot);
                    setSwapSelection(null);
                } finally {
                    setIsProcessing(false);
                }
            }
        } else {
            setSwapSelection(slot === swapSelection ? null : slot);
        }
    };

    const reset = (updated: boolean) => {
        if (isProcessing) return;
        setSwapSelection(null);
        setSearchTerm("");
        setSearchResults([]);
        if (updated) {
            onUpdatedClose();
        } else {
            onClose();
        }
    };

    const renderSlot = (slot: number) => {
        const pick = team?.Picks?.find((p: any) => p.OrderDrafted === slot);
        const isSelected = swapSelection === slot;

        return (
            <TouchableOpacity
                key={slot}
                onPress={() => handleSlotPress(slot)}
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
                                    {mode === 'swap' ? 'Moving' : 'Replace'}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleTeamUpdate = async () => {

        setIsProcessing(true);
        try {
            const payload: any = {};
            if (formData.TeamName) payload.TeamName = formData.TeamName;

            await apiRequest('/teams/update?id=' + team?.TeamId, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });

            Alert.alert("Victory", "Profile updated successfully!", [
                { text: "OK" }
            ]);
        } catch (err) {
            Alert.alert("Technical Foul", "Failed to update profile.");
        } finally {
            setIsProcessing(false);
        }
        reset(true);
    };

    const confirmLeaveLeague = (teamId: number) => {
        Alert.alert("Resign Position?", "Are you sure you want to leave this league? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Leave League", style: "destructive", onPress: async () => {
                    try {
                        await apiRequest(`/teams/delete?id=${teamId}`, { method: 'DELETE' });
                        router.navigate('/leagues');
                    } catch (err) { Alert.alert("Error", "Could not leave league."); }
                }
            }
        ]);
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
                        <Text className="text-2xl font-black text-red-600 uppercase italic">Front Office</Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Roster Management</Text>
                    </View>
                    <TouchableOpacity onPress={() => reset(false)} disabled={isProcessing} className="bg-neutral-900 p-2 rounded-full">
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
                    {/* Management Mode Toggle */}
                    <View className={`flex-row bg-neutral-900 rounded-2xl p-1 mb-6 ${isProcessing ? 'opacity-50' : ''}`}>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('swap'); setSwapSelection(null); }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'swap' ? 'bg-red-600' : ''}`}
                        >
                            <ArrowLeftRight size={14} color={mode === 'swap' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[9px] font-black uppercase italic ${mode === 'swap' ? 'text-white' : 'text-neutral-500'}`}>Manage Bench</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('pickup'); setSwapSelection(null); }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'pickup' ? 'bg-red-600' : ''}`}
                        >
                            <UserPlus size={14} color={mode === 'pickup' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[9px] font-black uppercase italic ${mode === 'pickup' ? 'text-white' : 'text-neutral-500'}`}>Free Agent</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={isProcessing}
                            onPress={() => { setMode('edit'); setSwapSelection(null); }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'edit' ? 'bg-red-600' : ''}`}
                        >
                            <Pencil size={14} color={mode === 'edit' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[9px] font-black uppercase italic ${mode === 'edit' ? 'text-white' : 'text-neutral-500'}`}>Edit Team</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Instruction Text */}
                    <Text className="text-neutral-500 font-bold uppercase text-[9px] mb-8 tracking-[0.2em] text-center">
                        {isProcessing ? "Processing Transaction..." :
                            mode === 'swap'
                                ? (swapSelection ? "Select destination slot to swap" : "Select a movie to start the swap")
                                : "Select a slot to replace with a free agent"
                        }
                    </Text>

                    {/* Pickup Mode Search UI */}
                    {mode === 'pickup' && swapSelection && (
                        <View className="bg-neutral-900 px-5 pt-6 rounded-3xl border border-neutral-800 mb-20">
                            <View className="flex-row items-center mb-6">
                                {searching ? (
                                    <ActivityIndicator size="small" color="#dc2626" />
                                ) : (
                                    <Search size={18} color="#dc2626" />
                                )}
                                <TextInput
                                    placeholder="Scout Free Agents..."
                                    placeholderTextColor="#525252"
                                    className="ml-3 flex-1 text-white font-bold uppercase italic "
                                    value={searchTerm}
                                    onChangeText={handleSearch}
                                    editable={!isProcessing}
                                />
                            </View>

                            {searchResults.map((movie: any) => (
                                <TouchableOpacity
                                    key={movie.id}
                                    // Use !! to convert the object/null to a true/false boolean
                                    disabled={isProcessing || !!movie.OwnedBy}
                                    className={`flex-row items-center bg-black/40 p-3 rounded-2xl mb-3 border ${!!movie.OwnedBy ? 'border-neutral-900 opacity-60' : 'border-neutral-800'
                                        }`}
                                    onPress={() => Alert.alert("Pickup", `Sign ${movie.title}?`)}
                                >
                                    <Image
                                        source={{ uri: `https://image.tmdb.org/t/p/w200${movie.poster_path}` }}
                                        className="w-12 h-16 rounded-lg"
                                    />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-white font-black uppercase italic text-xs" numberOfLines={1}>
                                            {movie.title}
                                        </Text>
                                        {/* THIS IS THE NEW LINE */}
                                        {movie.OwnedBy ? (
                                            <Text className="text-red-500 font-bold uppercase text-[8px] mt-0.5">
                                                Taken by {movie.OwnedBy.TeamName}
                                            </Text>
                                        ) : (
                                            <Text className="text-neutral-500 font-mono text-[10px]">
                                                {movie.release_date?.split('-')[0]}
                                            </Text>
                                        )}
                                    </View>
                                    <View className={`${movie.OwnedBy ? 'bg-neutral-800' : 'bg-green-600/20'} p-2 rounded-full`}>
                                        <UserPlus size={16} color={movie.OwnedBy ? '#404040' : '#22c55e'} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {mode !== 'edit' && (
                        <>
                            {/* Roster Sections */}
                            <View className="mb-4 flex-row items-center">
                                <Text className="text-white font-black uppercase italic text-sm tracking-tighter">Starting Lineup</Text>
                                <View className="flex-1 h-[1px] bg-neutral-800 ml-3" />
                            </View>
                            <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-4">
                                {Array.from({ length: startingSlots }).map((_, i) => renderSlot(i + 1))}
                            </View>

                            <View className="mb-4 flex-row items-center">
                                <Text className="text-neutral-500 font-black uppercase italic text-sm tracking-tighter">Bench</Text>
                                <View className="flex-1 h-[1px] bg-neutral-800 ml-3 opacity-30" />
                            </View>
                            <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-12">
                                {Array.from({ length: totalSlots - startingSlots }).map((_, i) => renderSlot(startingSlots + i + 1))}
                            </View>
                        </>
                    )}

                    {mode === 'edit' && (
                        <View className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2.5rem] space-y-6">
                            {/* Display Name */}
                            <View className='mb-2'>
                                <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                    Display Name
                                </Text>
                                <TextInput
                                    value={formData.TeamName}
                                    onChangeText={(val) => setFormData({ ...formData, TeamName: val })}
                                    placeholder="Display Name"
                                    placeholderTextColor="#404040"
                                    className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold"
                                />
                            </View>

                            <View className="h-[1px] bg-neutral-800 my-2" />

                            <TouchableOpacity
                                onPress={handleTeamUpdate}
                                activeOpacity={0.8}
                                className={`bg-red-600 py-5 rounded-2xl flex-row items-center justify-center mt-4}`}
                            >

                                <Text className="text-white font-black uppercase italic tracking-widest">
                                    Apply Changes
                                </Text>

                            </TouchableOpacity>

                            {/* Danger Zone */}
                            <View className="mt-12 mb-10 pt-6 border-t border-neutral-900">
                                <Text className="text-red-900 font-black uppercase text-[10px] tracking-widest mb-4 text-center">Danger Zone</Text>
                                <TouchableOpacity
                                    onPress={() => confirmLeaveLeague(team.TeamId)}
                                    disabled={isProcessing}
                                    className="bg-transparent border-2 border-red-900/30 py-4 rounded-2xl items-center justify-center"
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color="#7f1d1d" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <X size={16} color="#7f1d1d" />
                                            <Text className="text-red-900 font-black uppercase italic text-sm ml-2">Delete Team</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}



                    <View className="h-20" />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};