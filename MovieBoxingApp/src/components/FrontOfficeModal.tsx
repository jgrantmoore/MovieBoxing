import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    TextInput, Image, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { X, Search, ArrowLeftRight, UserPlus } from 'lucide-react-native';
import { MovieCard } from './MovieCard';

interface FrontOfficeProps {
    visible: boolean;
    onClose: () => void;
    team: any;
    startingSlots: number;
    totalSlots: number;
    onSwap: (slot1: number, slot2: number) => void; // Updated signature
    searchMovies: (query: string) => Promise<any[]>;
}

export const FrontOfficeModal = ({
    visible,
    onClose,
    team,
    startingSlots,
    totalSlots,
    onSwap,
    searchMovies
}: FrontOfficeProps) => {
    // Tracks the first slot selected for a swap
    const [swapSelection, setSwapSelection] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [mode, setMode] = useState<'swap' | 'pickup'>('swap');

    const handleSearch = async (text: string) => {
        setSearchTerm(text);
        if (text.length > 2) {
            const results = await searchMovies(text);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleSlotPress = (slot: number) => {
        if (mode === 'swap') {
            if (swapSelection === null) {
                setSwapSelection(slot);
            } else if (swapSelection === slot) {
                setSwapSelection(null); // Deselect
            } else {
                // Execute swap between two different slots
                onSwap(swapSelection, slot);
                setSwapSelection(null);
            }
        } else {
            // Pickup mode logic
            setSwapSelection(slot === swapSelection ? null : slot);
        }
    };

    const reset = () => {
        setSwapSelection(null);
        setSearchTerm("");
        setSearchResults([]);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-slate-950 py-10"
            >
                {/* Header */}
                <View className="p-6 pt-12 flex-row justify-between items-center border-b border-neutral-900">
                    <View>
                        <Text className="text-2xl font-black text-red-600 uppercase italic">Front Office</Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase">Roster Management</Text>
                    </View>
                    <TouchableOpacity onPress={reset}>
                        <X color="white" size={28} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
                    {/* Management Mode Toggle */}
                    <View className="flex-row bg-neutral-900 rounded-2xl p-1 mb-6">
                        <TouchableOpacity
                            onPress={() => { setMode('swap'); setSwapSelection(null); }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'swap' ? 'bg-red-600' : ''}`}
                        >
                            <ArrowLeftRight size={16} color={mode === 'swap' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[10px] font-black uppercase italic ${mode === 'swap' ? 'text-white' : 'text-neutral-500'}`}>Reshuffle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setMode('pickup'); setSwapSelection(null); }}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${mode === 'pickup' ? 'bg-red-600' : ''}`}
                        >
                            <UserPlus size={16} color={mode === 'pickup' ? 'white' : '#737373'} />
                            <Text className={`ml-2 text-[10px] font-black uppercase italic ${mode === 'pickup' ? 'text-white' : 'text-neutral-500'}`}>Free Agent</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-neutral-400 font-black uppercase text-[10px] mb-4 tracking-widest">
                        {mode === 'swap'
                            ? (swapSelection ? "2. Select Destination Slot" : "1. Select Movie to Move")
                            : "1. Select Slot to Replace"
                        }
                    </Text>

                    {/* Search only appears in Pickup Mode */}
                    {mode === 'pickup' && swapSelection && (
                        <View className="bg-neutral-900 p-5 rounded-3xl border border-neutral-800 mb-20">
                            <View className="flex-row items-center mb-6">
                                <Search size={18} color="#dc2626" />
                                <TextInput
                                    placeholder="Scout Free Agents..."
                                    placeholderTextColor="#525252"
                                    className="ml-3 flex-1 text-white font-bold uppercase italic h-10"
                                    value={searchTerm}
                                    onChangeText={handleSearch}
                                />
                            </View>

                            {searchResults.map((movie: any) => (
                                <TouchableOpacity
                                    key={movie.id}
                                    className="flex-row items-center bg-black/40 p-3 rounded-2xl mb-3 border border-neutral-800"
                                    onPress={() => {
                                        // Handle Free Agent Add (different API call logic usually)
                                        Alert.alert("Pickup", `Sign ${movie.title}?`);
                                    }}
                                >
                                    <Image
                                        source={{ uri: `https://image.tmdb.org/t/p/w200${movie.poster_path}` }}
                                        className="w-12 h-16 rounded-lg"
                                    />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-white font-black uppercase italic text-xs" numberOfLines={1}>
                                            {movie.title}
                                        </Text>
                                        <Text className="text-neutral-500 font-mono text-[10px]">
                                            {movie.release_date?.split('-')[0]}
                                        </Text>
                                    </View>
                                    <View className="bg-green-600/20 p-2 rounded-full">
                                        <UserPlus size={16} color="#22c55e" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View className="flex-row flex-wrap justify-between mb-8">
                        {Array.from({ length: totalSlots }).map((_, i) => {
                            const slot = i + 1;
                            const pick = team?.Picks?.find((p: any) => p.OrderDrafted === slot);
                            const isSelected = swapSelection === slot;

                            return (
                                <TouchableOpacity
                                    key={slot}
                                    onPress={() => handleSlotPress(slot)}
                                    className={`w-[32%] mb-4 rounded-3xl overflow-hidden border-2 ${isSelected ? 'border-red-600' : ''}`}
                                >
                                    <MovieCard
                                        title={pick?.Title || "Open Slot"}
                                        posterUrl={pick?.PosterUrl}
                                        isBench={slot > startingSlots}
                                        compact
                                    />
                                    {isSelected && (
                                        <View className="absolute inset-0 bg-red-600/20 items-center justify-center">
                                            <View className="bg-red-600 px-2 py-1 rounded">
                                                <Text className="text-white font-black uppercase italic text-[10px]">
                                                    {mode === 'swap' ? 'Moving' : 'Replace'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>


                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};