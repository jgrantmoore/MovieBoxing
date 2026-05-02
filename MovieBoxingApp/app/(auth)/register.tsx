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
    Image,
    Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronRight, AlertCircle, Check, Eye, EyeOff, User, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

const BoxingGloveL = require('../../assets/images/boxingloveL.png');
const BoxingGloveR = require('../../assets/images/boxingloveR.png');

export const HeaderLogo = () => (
    <View className="flex-row items-center justify-center mb-4">
        <Image source={BoxingGloveL} style={{ width: 35, height: 35 }} resizeMode="contain" />
        <Text className="text-2xl font-black tracking-tighter uppercase italic text-white ml-2">
            Movie<Text className="text-red-600">Boxing</Text>
        </Text>
        <Image source={BoxingGloveR} style={{ width: 35, height: 35 }} resizeMode="contain" className="ml-2" />
    </View>
);

export default function Register() {
    const router = useRouter();
    const { login, loginWithGoogle } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [isOver13, setIsOver13] = useState(false); // New state for age check
    const [loading, setLoading] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ageVerified, setAgeVerified] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [usernameStatus, setUsernameStatus] = useState<{
        loading: boolean;
        available: boolean | null;
        message: string;
    }>({ loading: false, available: null, message: '' });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Username Availability Check
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            const user = formData.username.trim();
            if (user.length < 3) {
                setUsernameStatus({ loading: false, available: null, message: '' });
                return;
            }
            setUsernameStatus(prev => ({ ...prev, loading: true }));
            try {
                const response = await fetch('https://api.movieboxing.com/api/auth/check-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user })
                });
                const data = await response.json();
                setUsernameStatus({
                    loading: false,
                    available: data.available,
                    message: data.message
                });
            } catch (err) {
                setUsernameStatus({ loading: false, available: null, message: 'Check failed' });
            }
        };

        const timeoutId = setTimeout(checkUsernameAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username]);

    const handleRegister = async () => {
        setError(null);
        if (usernameStatus.available === false) {
            setError(usernameStatus.message);
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!ageVerified) {
            setError('You must be 13+ to enter the ring');
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

    const handleGoogleLogin = async () => {
        setIsGoogleSubmitting(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            Alert.alert("Google Registration Failed", "Could not connect to Google services.");
        } finally {
            setIsGoogleSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
                <View className="mb-10 items-center">
                    <HeaderLogo />
                    <Text className="text-5xl font-black uppercase italic tracking-tighter text-white">REGISTER</Text>
                    <View className="h-1 w-12 bg-red-600 mt-2 self-center rounded-full" />
                </View>

                <View className="bg-neutral-900/50 border-2 border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl">
                    
                    {/* Credentials Grid */}
                    <View className="flex-row gap-x-3 mb-5">
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Name</Text>
                            <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4">
                                <User color="#525252" size={16} />
                                <TextInput
                                    className="flex-1 h-14 ml-3 text-white font-bold"
                                    placeholder="John"
                                    placeholderTextColor="#404040"
                                    value={formData.name}
                                    onChangeText={(v) => updateField('name', v)}
                                />
                            </View>
                        </View>
                        <View className="flex-1">
                            <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Username</Text>
                            <View className={`bg-black border rounded-2xl flex-row items-center px-4 ${
                                usernameStatus.available === true ? 'border-green-500/50' :
                                usernameStatus.available === false ? 'border-red-600/50' : 'border-neutral-800'
                            }`}>
                                <User color="#525252" size={16} />
                                <TextInput
                                    className="flex-1 h-14 ml-3 text-white font-bold"
                                    placeholder="fighter123"
                                    placeholderTextColor="#404040"
                                    autoCapitalize="none"
                                    value={formData.username}
                                    onChangeText={(v) => updateField('username', v)}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Email */}
                    <View className="mb-5">
                        <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Email Address</Text>
                        <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4">
                            <Mail color="#525252" size={16} />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-white font-bold"
                                placeholder="john@example.com"
                                placeholderTextColor="#404040"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={formData.email}
                                onChangeText={(v) => updateField('email', v)}
                            />
                        </View>
                    </View>

                    {/* Password Fields */}
                    <View className="mb-5">
                        <Text className="text-neutral-500 text-[9px] font-black uppercase mb-2 ml-1 tracking-widest">Create Password</Text>
                        <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4 mb-3">
                            <Lock color="#525252" size={16} />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-white font-bold"
                                secureTextEntry={!showPassword}
                                placeholder="••••••••"
                                placeholderTextColor="#404040"
                                value={formData.password}
                                onChangeText={(v) => updateField('password', v)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff color="#525252" size={18} /> : <Eye color="#525252" size={18} />}
                            </TouchableOpacity>
                        </View>
                        <View className="bg-black border border-neutral-800 rounded-2xl flex-row items-center px-4">
                            <Lock color="#525252" size={16} />
                            <TextInput
                                className="flex-1 h-14 ml-3 text-white font-bold"
                                secureTextEntry={!showConfirmPassword}
                                placeholder="Confirm Password"
                                placeholderTextColor="#404040"
                                value={formData.confirmPassword}
                                onChangeText={(v) => updateField('confirmPassword', v)}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff color="#525252" size={18} /> : <Eye color="#525252" size={18} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Age Check */}
                    <TouchableOpacity 
                        onPress={() => setAgeVerified(prev => !prev)} 
                        className="flex-row items-start mb-8"
                        activeOpacity={0.7}
                    >
                        <View className={`w-5 h-5 rounded border ${ageVerified ? 'bg-red-600 border-red-600' : 'border-neutral-800'} items-center justify-center mr-3 mt-0.5`}>
                            {ageVerified && <Check color="#fff" size={13} strokeWidth={4} />}
                        </View>
                        <Text className="text-neutral-500 text-[10px] font-bold italic uppercase tracking-tight pr-4">
                            I confirm that I am at least 13 years old and agree to the
                            <Text onPress={() => router.push('/privacy')} className="text-red-600 underline"> Privacy Policy.</Text>
                        </Text>
                    </TouchableOpacity>

                    {error && (
                        <View className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl flex-row items-center mb-6">
                            <AlertCircle color="#dc2626" size={18} />
                            <Text className="text-red-600 font-bold ml-3 flex-1 text-[11px] uppercase italic">{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleRegister}
                        disabled={loading || isGoogleSubmitting}
                        className={`py-5 rounded-2xl flex-row items-center justify-center shadow-lg ${loading ? 'bg-neutral-800' : 'bg-red-600 shadow-red-900/40'}`}
                    >
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Text className="text-white font-black uppercase italic text-lg mr-2">Step Into The Ring</Text>
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

                    {/* Google Button */}
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        disabled={loading || isGoogleSubmitting}
                        className="bg-black border border-neutral-800 py-4 rounded-2xl flex-row items-center justify-center"
                    >
                        {isGoogleSubmitting ? <ActivityIndicator color="white" /> : (
                            <>
                                <Image 
                                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
                                    style={{ width: 18, height: 18 }}
                                    className="mr-3"
                                />
                                <Text className="text-neutral-300 font-bold uppercase tracking-tight text-sm">Sign Up With Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.replace('/login')} className="mt-8 items-center">
                    <Text className="text-neutral-500 font-bold text-xs uppercase tracking-widest">
                        ALREADY REGISTERED? <Text className="text-red-600 font-black italic underline">LOGIN HERE</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}