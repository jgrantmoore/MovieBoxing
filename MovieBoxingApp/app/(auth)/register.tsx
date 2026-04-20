import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronRight, AlertCircle } from 'lucide-react-native';
import { apiRequest } from '@/src/api/client';
import { useAuth } from '../../src/context/AuthContext';

// --- LOCAL ASSETS ---
const BoxingGloveL = require('../../assets/images/boxingloveL.png');
const BoxingGloveR = require('../../assets/images/boxingloveR.png');

// --- COMPONENT: LOGO ---
export const HeaderLogo = () => {
    return (
        <View className="flex-row items-center justify-center mb-4">
            <Image
                source={BoxingGloveL}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
            />
            <Text className="text-2xl font-black tracking-tighter uppercase italic text-white ml-2">
                Movie<Text className="text-red-600">Boxing</Text>
            </Text>
            <Image
                source={BoxingGloveR}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
                className="ml-2"
            />
        </View>
    );
};

// --- MAIN PAGE: REGISTER ---
export default function Register() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const { login } = useAuth();

    const handleRegister = async () => {
        const { name, username, email, password, confirmPassword } = formData;
        setError(null);

        // 1. Client-side Validation (Matching your Express Controller logic)
        if (!name || !username || !email || !password) {
            setError("Must enter all fields to create account.");
            return;
        }

        if (username.length < 3 || username.length > 50) {
            setError("Username must be between 3 and 50 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            // 2. Call Register API
            const response = await fetch('https://api.movieboxing.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    username: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password
                })
            });

            const data = await response.json();

            if (response.ok && data.accessToken) {
                // 3. Automatically log them in!
                const userPayload = {
                    userId: data.userId,
                    displayName: data.displayName,
                    username: data.username,
                    email: data.email
                };

                await login(data.accessToken, data.refreshToken, userPayload);

                // Note: AuthContext state update usually triggers the router 
                // but you can replace it manually if needed:
                // router.replace('/home');
            } else {
                setError(data.message || "The ref called a foul.");
            }

        } catch (err: any) {
            console.error("Registration Error:", err);
            setError("The arena is unreachable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-950"
        >
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Section */}
                <View className="mb-10 items-center">
                    <HeaderLogo />
                    <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                        REGISTER
                    </Text>
                    <View className="h-1 w-12 bg-red-600 mt-2 self-center rounded-full" />
                </View>

                {/* Registration Card */}
                <View className="bg-neutral-900/50 border-2 border-neutral-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                    <View className="absolute top-0 right-0 left-0 h-[2px] bg-red-600/30" />

                    {/* Display Name & Username */}
                    <View className="flex-row gap-x-3 mb-4">
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Display Name</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                placeholder="John"
                                placeholderTextColor="#404040"
                                value={formData.name}
                                onChangeText={(v) => updateField('name', v)}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Username</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                placeholder="fighter123"
                                placeholderTextColor="#404040"
                                autoCapitalize="none"
                                value={formData.username}
                                onChangeText={(v) => updateField('username', v)}
                            />
                        </View>
                    </View>

                    {/* Email Address */}
                    <View className="mb-4">
                        <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Email Address</Text>
                        <TextInput
                            className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                            placeholder="john@example.com"
                            placeholderTextColor="#404040"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formData.email}
                            onChangeText={(v) => updateField('email', v)}
                        />
                    </View>

                    {/* Passwords */}
                    <View className="flex-row gap-x-3 mb-6">
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Password</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                placeholder="••••"
                                placeholderTextColor="#404040"
                                secureTextEntry
                                value={formData.password}
                                onChangeText={(v) => updateField('password', v)}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Confirm</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                placeholder="••••"
                                placeholderTextColor="#404040"
                                secureTextEntry
                                value={formData.confirmPassword}
                                onChangeText={(v) => updateField('confirmPassword', v)}
                            />
                        </View>
                    </View>

                    {/* Error Message Display */}
                    {error && (
                        <View className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl flex-row items-center mb-6">
                            <AlertCircle color="#dc2626" size={18} />
                            <Text className="text-red-600 font-bold ml-3 flex-1 text-[11px] leading-tight uppercase italic">
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.8}
                        className={`bg-red-600 py-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-red-900/40 ${loading ? 'opacity-50' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-black uppercase italic text-lg mr-2 tracking-tight">Step Into The Ring</Text>
                                <ChevronRight color="white" size={20} strokeWidth={3} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View className="mt-8 items-center">
                    <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
                            ALREADY REGISTERED? <Text className="text-red-600 font-black italic underline">LOGIN HERE</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}