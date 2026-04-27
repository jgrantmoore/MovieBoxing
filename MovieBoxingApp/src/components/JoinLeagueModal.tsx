import React, { useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { X, Trophy, Armchair, ShieldCheck, Eye, EyeOff, Clapperboard } from 'lucide-react-native';
import { LeagueData } from '../types/league';
import { useAuth } from '../context/AuthContext';
import '../../global.css';
import { apiRequest } from '../api/client';

interface JoinLeagueProps {
    visible: boolean;
    leagueInfo: LeagueData;
    onClose: () => void;
}

export const JoinLeagueModal = ({
    visible,
    leagueInfo,
    onClose,
}: JoinLeagueProps) => {
    const { session } = useAuth();
    const [teamName, setTeamName] = useState(session?.user?.displayName ? `${session.user.displayName}'s Team` : '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const reset = () => {
        setPassword('');
        setShowPassword(false);
        onClose();
    };

    const handleJoin = () => {
        if (leagueInfo.HasDrafted) {
            Alert.alert("League Locked", "This league has already drafted. You cannot join at this time.");
            return;
        }

        if (leagueInfo.isPrivate && password.trim() === '') {
            Alert.alert("Password Required", "This is a private league. Please enter the password to join.");
            return;
        }

        apiRequest(`/teams/create`, {
            method: 'POST',
            body: JSON.stringify({
                LeagueId: leagueInfo.LeagueId,
                TeamName: teamName.trim(),
                LeaguePassword: leagueInfo.isPrivate ? password : undefined
            })
        }).then(() => {
            Alert.alert("Success", "You have joined the league!");
            reset();
        }).catch((err) => {
            console.error(err);
            Alert.alert("Error", "Could not join league. Please check your password and try again.");
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={reset}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-slate-950"
            >
                {/* Header */}
                <View className="px-6 pt-14 pb-6 flex-row justify-between items-center border-b border-neutral-900">
                    <View>
                        <Text className="text-3xl font-black text-white uppercase italic tracking-tighter">
                            JOIN <Text className="text-red-600">LEAGUE</Text>
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={reset}
                        className="bg-neutral-900 p-2 rounded-full border border-neutral-800"
                    >
                        <X color="#737373" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    className="flex-1 p-6"
                    keyboardDismissMode='on-drag'
                    showsVerticalScrollIndicator={false}
                >
                    {/* League Quick Info Card */}
                    <View className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-5 mb-10">
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mb-1">
                            Joining
                        </Text>
                        <Text className="text-2xl font-black text-white uppercase italic mb-4">
                            {leagueInfo.LeagueName}
                        </Text>

                        <View className="flex-row border-t border-neutral-800/50 pt-4 gap-4">
                            <View className="flex-row items-center">
                                <Trophy size={14} color="#dc2626" />
                                <Text className="text-white font-black italic ml-2 text-xs uppercase">{leagueInfo.Rules?.Starting} Starters</Text>
                            </View>
                            <View className="flex-row items-center">
                                <Armchair size={14} color="#dc2626" />
                                <Text className="text-white font-black italic ml-2 text-xs uppercase">{leagueInfo.Rules?.Bench} Bench</Text>
                            </View>
                        </View>
                    </View>

                    {/* Inputs */}
                    <View>
                        {/* Team Name Input */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-3">
                                <Clapperboard size={14} color="#dc2626" />
                                <Text className="text-neutral-400 font-black uppercase italic text-xs tracking-widest ml-2">
                                    Define Your Team
                                </Text>
                            </View>
                            <TextInput
                                placeholder="THE HOLLYWOOD TITANS"
                                placeholderTextColor="#404040"
                                value={teamName}
                                onChangeText={setTeamName}
                                textAlignVertical="center"
                                className="bg-neutral-900 text-white font-black uppercase italic text-lg border border-neutral-800 rounded-2xl px-5 pb-3 h-16 focus:border-red-600"
                            />
                        </View>

                        {/* Password Input (If Private) */}
                        {leagueInfo.isPrivate && (
                            <View>
                                <View className="flex-row items-center mb-3">
                                    <ShieldCheck size={14} color="#dc2626" />
                                    <Text className="text-neutral-400 font-black uppercase italic text-xs tracking-widest ml-2">
                                        Password Required
                                    </Text>
                                </View>
                                <View className="relative justify-center">
                                    <TextInput
                                        placeholder="Enter League Password"
                                        placeholderTextColor="#404040"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        className="bg-neutral-900 text-white font-mono text-lg border border-neutral-800 rounded-2xl pl-5 pr-14 h-16 focus:border-red-600"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 p-2"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#737373" />
                                        ) : (
                                            <Eye size={20} color="#737373" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Join Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        className="mt-12 bg-red-600 rounded-2xl py-5 shadow-lg shadow-red-900/20 border-b-4 border-red-800"
                        onPress={handleJoin}
                    >
                        <Text className="text-white font-black uppercase italic text-center text-lg tracking-tight">
                            Confirm Registration
                        </Text>
                    </TouchableOpacity>

                    <Text className="text-neutral-600 text-[10px] text-center mt-6 font-mono uppercase">
                        By joining, you will be enrolled for the upcoming draft and season. Make sure to show up on draft day!
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};