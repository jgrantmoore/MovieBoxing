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
    const auth = useAuth();
    const login = auth?.login;
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Missing Credentials", "Please fill out all fields.");
            return;
        }

        if (!login) {
            Alert.alert("Auth Error", "Authentication service unavailable.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Note: Change this URL to your actual Railway endpoint if production
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

                // CRITICAL: We now pass accessToken AND refreshToken
                await login(data.accessToken, data.refreshToken, userPayload);

                // Expo Router will usually auto-redirect if your layout 
                // checks for the session, but you can also force it:
                // router.replace('/home'); 

            } else {
                Alert.alert("Ref Stopped the Fight", data.message || "Invalid credentials");
            }
        } catch (err) {
            console.error("Login Fetch Error:", err);
            Alert.alert("Connection Error", "The arena is unreachable.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-950"
        >
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>

                {/* Logo & Header Section */}
                <View className="mb-10 items-center">
                    <HeaderLogo />
                    <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">
                        LOGIN
                    </Text>
                    <View className="h-1 w-12 bg-red-600 mt-2 self-center rounded-full" />
                </View>

                {/* Login Card Container */}
                <View className="bg-neutral-900/50 border-2 border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">

                    <View className="space-y-5">
                        {/* Email Input */}
                        <View>
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Credentials</Text>
                            <View className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl flex-row items-center px-4">
                                <Mail color="#525252" size={18} />
                                <TextInput
                                    placeholder="Username or Email"
                                    placeholderTextColor="#404040"
                                    className="flex-1 h-14 ml-3 text-white font-bold"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View className="mt-4">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Security</Text>
                            <View className="bg-black border border-neutral-800 focus:border-red-600/50 rounded-2xl flex-row items-center px-4">
                                <Lock color="#525252" size={18} />
                                <TextInput
                                    placeholder="Password"
                                    placeholderTextColor="#404040"
                                    className="flex-1 h-14 ml-3 text-white font-bold"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff color="#525252" size={20} /> : <Eye color="#525252" size={20} />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
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
                    </View>
                </View>

                {/* Footer Link */}
                <TouchableOpacity onPress={() => router.navigate('/register')} className="mt-8 items-center">
                    <Text className="text-neutral-500 font-bold text-xs uppercase tracking-tighter">
                        NEW TO THE LEAGUE? <Text className="text-red-600 font-black italic underline">CREATE ACCOUNT</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}