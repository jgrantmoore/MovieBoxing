import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
            <ScrollView className="flex-1 bg-slate-950 px-6 mt-12">

                <View className="py-12 pb-24">
                    {/* Header */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-4"
                    >
                        <Text className="text-sm font-bold uppercase tracking-widest text-neutral-500 italic">
                            ← Back
                        </Text>
                    </TouchableOpacity>
                    <View className="items-center mb-12">
                        <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                            PRIVACY <Text className="text-red-600">POLICY</Text>
                        </Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">
                            Last Updated: April 20, 2026
                        </Text>
                    </View>



                    {/* Content Container */}
                    <View className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2.5rem]">

                        {/* Section 1 */}
                        <View className="mb-10">
                            <Text className="text-2xl font-black uppercase italic text-red-600 mb-3 tracking-tight">
                                1. Introduction
                            </Text>
                            <Text className="text-neutral-300 leading-6">
                                Welcome to <Text className="text-white font-bold">MovieBoxing</Text>. We value your privacy and are committed to protecting your personal data. This policy outlines how we handle your information as we grow our fantasy movie league platform.
                            </Text>
                        </View>

                        {/* Section 2 */}
                        <View className="mb-10">
                            <Text className="text-2xl font-black uppercase italic text-red-600 mb-3 tracking-tight">
                                2. Data We Collect
                            </Text>
                            <Text className="text-neutral-300 mb-4 leading-6">
                                We collect data to provide a functional and competitive experience:
                            </Text>
                            <View className="space-y-3 pl-2">
                                <Text className="text-neutral-400 font-medium">
                                    • <Text className="text-white">Account Information:</Text> Email and display name via Google or registration.
                                </Text>
                                <Text className="text-neutral-400 font-medium">
                                    • <Text className="text-white">Gameplay Data:</Text> League participation, movie draft picks, and roster history.
                                </Text>
                                <Text className="text-neutral-400 font-medium">
                                    • <Text className="text-white">Usage:</Text> Secure session tokens and basic analytics.
                                </Text>
                            </View>
                        </View>

                        {/* Section 3 */}
                        <View className="mb-10">
                            <Text className="text-2xl font-black uppercase italic text-red-600 mb-3 tracking-tight">
                                3. How We Use Your Data
                            </Text>
                            <Text className="text-neutral-300 mb-4 leading-6">
                                Your information is used for core app functionality and platform growth:
                            </Text>

                            <View className="space-y-4">
                                <View className="p-4 bg-black/40 border border-neutral-800 rounded-2xl">
                                    <Text className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Identity & Competition</Text>
                                    <Text className="text-white text-xs leading-5">To display your name on leaderboards and manage your movie rosters.</Text>
                                </View>
                                <View className="p-4 bg-black/40 border border-neutral-800 rounded-2xl">
                                    <Text className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Service Improvements</Text>
                                    <Text className="text-white text-xs leading-5">To analyze platform usage and deliver account-related updates.</Text>
                                </View>
                            </View>
                        </View>

                        {/* Section 4 */}
                        <View className="mb-10">
                            <Text className="text-2xl font-black uppercase italic text-red-600 mb-3 tracking-tight">
                                4. Sharing & Third-Parties
                            </Text>
                            <Text className="text-neutral-300 leading-6 mb-4">
                                <Text className="text-white font-bold">We do not sell your personal data.</Text> To support the platform, we work with:
                            </Text>
                            <View className="space-y-4 pl-2">
                                <Text className="text-neutral-400 text-xs leading-5">
                                    <Text className="text-white font-bold">• Advertising:</Text> Partners may use cookies to serve relevant ads.
                                </Text>
                                <Text className="text-neutral-400 text-xs leading-5">
                                    <Text className="text-white font-bold">• Payments:</Text> Transactions are handled by third-party processors. We do not store credit card details.
                                </Text>
                                <Text className="text-neutral-400 text-xs leading-5">
                                    <Text className="text-white font-bold">• Infrastructure:</Text> Secure cloud storage.
                                </Text>
                            </View>
                        </View>

                        {/* Section 5 */}
                        <View className="pt-8 border-t border-neutral-800">
                            <Text className="text-xl font-bold text-white mb-2 italic uppercase">Questions?</Text>
                            <Text className="text-neutral-500 text-xs leading-5">
                                Contact the MovieBoxing team at: {"\n"}
                                <Text className="text-red-500 font-mono">jgrantmoore17@gmail.com</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Navigation Back */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-12 items-center"
                    >
                        <Text className="text-sm font-bold uppercase tracking-widest text-neutral-500 italic">
                            ← Back
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}