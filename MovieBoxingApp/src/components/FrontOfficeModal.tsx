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
    onSwap: (slot1: number, slot2: number) => void;
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
                setSwapSelection(null);
            } else {
                onSwap(swapSelection, slot);
                setSwapSelection(null);
            }
        } else {
            setSwapSelection(slot === swapSelection ? null : slot);
        }
    };

    const reset = () => {
        setSwapSelection(null);
        setSearchTerm("");
        setSearchResults([]);
        onClose();
    };

    const renderSlot = (slot: number) => {
        const pick = team?.Picks?.find((p: any) => p.OrderDrafted === slot);
        const isSelected = swapSelection === slot;
        
        return (
            <TouchableOpacity
                key={slot}
                onPress={() => handleSlotPress(slot)}
                activeOpacity={0.7}
                className={`w-[31%] mb-4 rounded-3xl overflow-hidden border-2 ${
                    isSelected ? 'border-red-600 bg-red-600/10' : 'border-transparent'
                }`}
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
                            <Text className="text-white font-black uppercase italic text-[10px]">
                                {mode === 'swap' ? 'Moving' : 'Replace'}
                            </Text>
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
                        <Text className="text-2xl font-black text-red-600 uppercase italic">Front Office</Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest">Roster Management</Text>
                    </View>
                    <TouchableOpacity onPress={reset} className="bg-neutral-900 p-2 rounded-full">
                        <X color="white" size={24} />
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

                    {/* Instruction Text */}
                    <Text className="text-neutral-500 font-bold uppercase text-[9px] mb-8 tracking-[0.2em] text-center">
                        {mode === 'swap'
                            ? (swapSelection ? "Select destination slot to swap" : "Select a movie to start the swap")
                            : "Select a slot to replace with a free agent"
                        }
                    </Text>

                    {/* Section 1: Starting Lineup */}
                    <View className="mb-4 flex-row items-center">
                        <Text className="text-white font-black uppercase italic text-sm tracking-tighter">Starting Lineup</Text>
                        <View className="flex-1 h-[1px] bg-neutral-800 ml-3" />
                    </View>
                    <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-4">
                        {Array.from({ length: startingSlots }).map((_, i) => renderSlot(i + 1))}
                    </View>

                    {/* Section 2: Bench */}
                    <View className="mb-4 flex-row items-center">
                        <Text className="text-neutral-500 font-black uppercase italic text-sm tracking-tighter">Bench</Text>
                        <View className="flex-1 h-[1px] bg-neutral-800 ml-3 opacity-30" />
                    </View>
                    <View className="flex-row flex-wrap justify-start gap-x-[3.5%] mb-12">
                        {Array.from({ length: totalSlots - startingSlots }).map((_, i) => renderSlot(startingSlots + i + 1))}
                    </View>

                    {/* Pickup Mode Search UI */}
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
                    
                    {/* Extra space for scrolling */}
                    <View className="h-20" />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};