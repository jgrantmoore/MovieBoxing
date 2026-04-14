import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Trophy } from 'lucide-react-native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();

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
                    username: email, // Matches web formData 'username' field
                    password: password
                }),
            });

            const data = await response.json();

            console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2));

            if (response.ok && data.token) {
                // We map the keys from your RAW API RESPONSE exactly
                const userPayload = {
                    id: data.userId,           // "1"
                    name: data.displayName,    // "Grant"
                    username: data.username,   // "grant"
                    email: data.email          // "jgrantmoore17@gmail.com"
                };

                console.log("Passing to login:", userPayload);

                await login(data.token, userPayload);
            } else {
                Alert.alert("Ref Stopped the Fight", data.message || "Invalid credentials");
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Connection Error", "The arena is unreachable. Check your network.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-950"
        >
            <View className="flex-1 justify-center px-8">
                {/* Branding */}
                <View className="items-center mb-12">
                    <View className="bg-red-600 p-4 rounded-3xl rotate-3 shadow-lg shadow-red-600/40">
                        <Trophy color="white" size={40} />
                    </View>
                    <Text className="text-4xl font-black uppercase italic tracking-tighter text-white mt-6">
                        MOVIE <Text className="text-red-600">BOXING</Text>
                    </Text>
                    <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">
                        The Ultimate Fantasy Movie League
                    </Text>
                </View>

                {/* Form */}
                <View className="space-y-4">
                    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl flex-row items-center px-4 py-1">
                        <Mail color="#525252" size={20} />
                        <TextInput
                            placeholder="Email Address"
                            placeholderTextColor="#525252"
                            className="flex-1 h-12 ml-3 text-white font-bold"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl flex-row items-center px-4 py-1 mt-4">
                        <Lock color="#525252" size={20} />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#525252"
                            className="flex-1 h-12 ml-3 text-white font-bold"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff color="#525252" size={20} /> : <Eye color="#525252" size={20} />}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                        className={`mt-8 py-4 rounded-2xl items-center shadow-xl ${isSubmitting ? 'bg-neutral-800' : 'bg-red-600 shadow-red-600/20'}`}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-black uppercase italic text-lg">Enter the Ring</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity className="mt-8 items-center">
                    <Text className="text-neutral-500 font-bold text-xs uppercase tracking-tighter">
                        Don't have an account? <Text className="text-red-600 underline">Sign Up</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}