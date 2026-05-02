import React, { useState, useEffect } from 'react';
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
import { ChevronRight, AlertCircle, Check } from 'lucide-react-native'; // Added Check icon
import { apiRequest } from '@/src/api/client';
import { useAuth } from '../../src/context/AuthContext';

const BoxingGloveL = require('../../assets/images/boxingloveL.png');
const BoxingGloveR = require('../../assets/images/boxingloveR.png');

export default function Register() {
    const router = useRouter();
    const { login } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [isOver13, setIsOver13] = useState(false); // New state for age check
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [usernameStatus, setUsernameStatus] = useState<{
        loading: boolean;
        available: boolean | null;
        message: string;
    }>({ loading: false, available: null, message: '' });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        const checkUsernameAvailability = async () => {
            const user = formData.username.trim();
            if (user.length < 3) {
                setUsernameStatus({ loading: false, available: null, message: '' });
                return;
            }

            setUsernameStatus(prev => ({ ...prev, loading: true }));

            try {
                const data = await apiRequest('/auth/check-username', {
                    method: 'POST',
                    body: JSON.stringify({ username: user })
                });

                setUsernameStatus({
                    loading: false,
                    available: data.available,
                    message: data.message
                });
            } catch (err) {
                setUsernameStatus({ loading: false, available: null, message: 'Check failed' });
            }
        };

        const timeoutId = setTimeout(() => {
            checkUsernameAvailability();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    const handleRegister = async () => {
        setError(null);

        // Validation for age check
        if (!isOver13) {
            setError('You must be over 13 to join the arena');
            return;
        }

        if (usernameStatus.available === false) {
            setError(usernameStatus.message);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('https://api.movieboxing.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    username: formData.username.trim().toLowerCase(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok && data.accessToken) {
                const userPayload = {
                    userId: data.userId,
                    displayName: data.displayName,
                    username: data.username,
                    email: data.email
                };
                await login(data.accessToken, data.refreshToken, userPayload);
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("The arena is unreachable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
                
                <View className="mb-10 items-center">
                    <View className="flex-row items-center justify-center mb-4">
                        <Image source={BoxingGloveL} style={{ width: 35, height: 35 }} resizeMode="contain" />
                        <Text className="text-2xl font-black tracking-tighter uppercase italic text-white ml-2">
                            Movie<Text className="text-red-600">Boxing</Text>
                        </Text>
                        <Image source={BoxingGloveR} style={{ width: 35, height: 35 }} resizeMode="contain" className="ml-2" />
                    </View>
                    <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">REGISTER</Text>
                    <View className="h-1 w-12 bg-red-600 mt-2 self-center rounded-full" />
                </View>

                <View className="bg-neutral-900/50 border-2 border-neutral-800 rounded-[2.5rem] p-6 shadow-2xl">
                    
                    <View className="flex-row gap-x-3 mb-4">
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Name</Text>
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
                                className={`bg-black border rounded-2xl px-4 py-4 text-white font-bold transition-colors ${
                                    usernameStatus.available === true ? 'border-green-500' : 
                                    usernameStatus.available === false ? 'border-red-600' : 'border-neutral-800'
                                }`}
                                placeholder="fighter123"
                                placeholderTextColor="#404040"
                                autoCapitalize="none"
                                value={formData.username}
                                onChangeText={(v) => updateField('username', v)}
                            />
                            {formData.username.length >= 3 && (
                                <Text className={`text-[10px] mt-1 font-bold italic uppercase tracking-tight ml-1 ${
                                    usernameStatus.available ? 'text-green-500' : 'text-red-600'
                                }`}>
                                    {usernameStatus.loading ? 'Checking...' : usernameStatus.message}
                                </Text>
                            )}
                        </View>
                    </View>

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

                    <View className="flex-row gap-x-3 mb-4">
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Password</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor="#404040"
                                value={formData.password}
                                onChangeText={(v) => updateField('password', v)}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Confirm</Text>
                            <TextInput
                                className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl px-4 py-4 text-white font-bold"
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor="#404040"
                                value={formData.confirmPassword}
                                onChangeText={(v) => updateField('confirmPassword', v)}
                            />
                        </View>
                    </View>

                    {/* --- Age Verification Selector --- */}
                    <TouchableOpacity 
                        onPress={() => setIsOver13(!isOver13)}
                        activeOpacity={0.7}
                        className="flex-row items-center mb-6 ml-1"
                    >
                        <View className={`w-5 h-5 rounded-md border-2 items-center justify-center ${isOver13 ? 'bg-red-600 border-red-600' : 'border-neutral-700 bg-black'}`}>
                            {isOver13 && <Check color="white" size={14} strokeWidth={4} />}
                        </View>
                        <Text className="text-neutral-400 text-[10px] font-black uppercase ml-3 tracking-tight">
                            I confirm I am <Text className="text-white">over 13 years of age</Text>
                        </Text>
                    </TouchableOpacity>

                    {error && (
                        <View className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl flex-row items-center mb-6">
                            <AlertCircle color="#dc2626" size={18} />
                            <Text className="text-red-600 font-bold ml-3 flex-1 text-[11px] leading-tight uppercase italic">{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleRegister}
                        disabled={loading || usernameStatus.available === false || !isOver13}
                        activeOpacity={0.8}
                        className={`bg-red-600 py-5 rounded-2xl flex-row items-center justify-center ${loading || usernameStatus.available === false || !isOver13 ? 'opacity-50' : ''}`}
                    >
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Text className="text-white font-black uppercase italic text-lg mr-2 tracking-tight">Step Into The Ring</Text>
                                <ChevronRight color="white" size={20} strokeWidth={3} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

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