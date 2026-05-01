import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
    ScrollView
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

// Local Assets for Logo
const BoxingGloveL = require('../../assets/images/boxingloveL.png');
const BoxingGloveR = require('../../assets/images/boxingloveR.png');

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

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    
    // Pull the new loginWithGoogle function
    const { login, loginWithGoogle } = useAuth(); 
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Missing Credentials", "Please fill out all fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('https://api.movieboxing.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: email,
                    password: password
                }),
            });

            const data = await response.json();

            if (response.ok && data.accessToken && data.refreshToken) {
                const userPayload = {
                    userId: data.userId,
                    displayName: data.displayName,
                    username: data.username,
                    email: data.email
                };
                await login(data.accessToken, data.refreshToken, userPayload);
            } else {
                Alert.alert("Ref Stopped the Fight", data.message || "Invalid credentials");
            }
        } catch (err) {
            Alert.alert("Connection Error", "The arena is unreachable.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleSubmitting(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            // Error is already logged in the provider, but we alert the user
            Alert.alert("Google Login Failed", "Could not connect to Google services.");
        } finally {
            setIsGoogleSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-950"
        >
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

                <View className="mb-10 items-center">
                    <HeaderLogo />
                    <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                        LOGIN
                    </Text>
                    <View className="h-1 w-12 bg-red-600 mt-2 self-center rounded-full" />
                </View>

                <View className="bg-neutral-900/50 border-2 border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <View className="space-y-5">
                        <View>
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Credentials</Text>
                            <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4">
                                <Mail color="#525252" size={18} />
                                <TextInput
                                    placeholder="Username or Email"
                                    placeholderTextColor="#404040"
                                    className="flex-1 h-14 ml-3 text-white font-bold leading-none pt-1"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View className="mt-4">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Security</Text>
                            <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4">
                                <Lock color="#525252" size={18} />
                                <TextInput
                                    placeholder="Password"
                                    placeholderTextColor="#404040"
                                    className="flex-1 h-14 ml-3 text-white font-bold leading-none pt-1"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff color="#525252" size={20} /> : <Eye color="#525252" size={20} />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={isSubmitting || isGoogleSubmitting}
                            className={`mt-8 py-5 rounded-2xl flex-row items-center justify-center shadow-lg ${isSubmitting ? 'bg-neutral-800' : 'bg-red-600 shadow-red-900/40'}`}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text className="text-white font-black uppercase italic text-lg mr-2">Enter the Ring</Text>
                                    <ChevronRight color="white" size={20} strokeWidth={3} />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View className="flex-row items-center my-6">
                            <View className="flex-1 h-[1px] bg-neutral-800" />
                            <Text className="mx-4 text-neutral-600 font-black text-[10px] uppercase tracking-widest">OR</Text>
                            <View className="flex-1 h-[1px] bg-neutral-800" />
                        </View>

                        {/* Google Login Button */}
                        <TouchableOpacity
                            onPress={handleGoogleLogin}
                            disabled={isSubmitting || isGoogleSubmitting}
                            activeOpacity={0.7}
                            className="bg-black border border-neutral-800 py-4 rounded-2xl flex-row items-center justify-center"
                        >
                            {isGoogleSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Image 
                                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
                                        style={{ width: 18, height: 18 }}
                                        className="mr-3"
                                    />
                                    <Text className="text-neutral-300 font-bold uppercase tracking-tight text-sm">Continue with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity onPress={() => router.replace('/register')} className="mt-8 items-center">
                    <Text className="text-neutral-500 font-bold text-xs uppercase tracking-tighter">
                        NEW TO THE LEAGUE? <Text className="text-red-600 font-black italic underline">CREATE ACCOUNT</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}