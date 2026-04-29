import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { apiRequest } from '../../../src/api/client';
import { useAuth } from '../../../src/context/AuthContext';
import { Eye, EyeOff } from 'lucide-react-native';

export default function EditProfile() {
    const { session } = useAuth();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: session?.user?.displayName || '',
        username: session?.user?.username || '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    // --- Matches your Web State structure ---
    const [usernameStatus, setUsernameStatus] = useState<{
        loading: boolean;
        available: boolean | null;
        message: string;
    }>({ loading: false, available: null, message: '' });

    // --- DEBOUNCED USERNAME CHECK (Matches Web Logic) ---
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            const user = formData.username.trim();

            // 1. Skip check if too short OR if it's the user's current username
            if (user.length < 3 || user === session?.user?.username) {
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
    }, [formData.username, session?.user?.username]);

    const handleUpdate = async () => {
        // Block update if username is taken
        if (usernameStatus.available === false) {
            Alert.alert("Referee Intervention", usernameStatus.message);
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            Alert.alert("Referee Intervention", "Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            const payload: any = {};
            if (formData.name) payload.name = formData.name;
            if (formData.username) payload.username = formData.username.trim().toLowerCase();
            if (formData.password) payload.password = formData.password;

            await apiRequest('/user/update', {
                method: 'PUT',
                body: JSON.stringify(payload),
            });

            Alert.alert("Victory", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (err) {
            Alert.alert("Technical Foul", "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-950"
        >
            <Stack.Screen options={{ title: 'EDIT PROFILE', headerShown: true }} />

            <ScrollView className="flex-1 px-6">
                <View className="py-10 pb-20">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-4"
                    >
                        <Text className="text-sm font-bold uppercase tracking-widest text-neutral-500 italic">
                            ← Back
                        </Text>
                    </TouchableOpacity>
                    <View className="mb-10 items-center">
                        <Text className="text-4xl font-black uppercase italic tracking-tighter text-white">
                            EDIT <Text className="text-red-600">PROFILE</Text>
                        </Text>
                        <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">
                            Update your credentials
                        </Text>
                    </View>

                    <View className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2.5rem] space-y-6">
                        {/* Display Name */}
                        <View className='mb-2'>
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                Display Name
                            </Text>
                            <TextInput
                                value={formData.name}
                                onChangeText={(val) => setFormData({ ...formData, name: val })}
                                placeholder="Display Name"
                                placeholderTextColor="#404040"
                                className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold"
                            />
                        </View>

                        {/* Username Section */}
                        <View className='mb-2'>
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                Username
                            </Text>
                            <TextInput
                                value={formData.username}
                                onChangeText={(val) => setFormData({ ...formData, username: val })}
                                placeholder="Username"
                                placeholderTextColor="#404040"
                                autoCapitalize="none"
                                className={`w-full px-4 py-4 bg-black border rounded-2xl lowercase text-white font-bold ${usernameStatus.available === true ? 'border-green-500' :
                                    usernameStatus.available === false ? 'border-red-600' : 'border-neutral-800'
                                    }`}
                            />
                            {formData.username.length >= 3 && formData.username !== session?.user?.username && (
                                <Text className={`text-[10px] mt-2 font-bold italic uppercase tracking-tight ml-1 ${usernameStatus.available ? 'text-green-500' : 'text-red-600'
                                    }`}>
                                    {usernameStatus.loading ? 'Checking...' : usernameStatus.message}
                                </Text>
                            )}
                        </View>

                        <View className="h-[1px] bg-neutral-800 my-2" />

                        <View className='mb-2'>
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                New Password (Optional)
                            </Text>
                            <View className="relative justify-center">
                                <TextInput
                                    value={formData.password}
                                    onChangeText={(val) => setFormData({ ...formData, password: val })}
                                    placeholder="••••••••"
                                    placeholderTextColor="#404040"
                                    // 2. Use state here
                                    secureTextEntry={!showPassword}
                                    className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold pr-16"
                                />
                                {/* 3. Toggle Button */}
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="absolute right-4"
                                >
                                    <Text className="text-[10px] font-black uppercase italic text-red-600 tracking-tighter">
                                        {showPassword ? <EyeOff color="#525252" size={18} /> : <Eye color="#525252" size={18} />}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password Field */}
                        <View className='mb-2'>
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                Confirm Password
                            </Text>
                            <View className="relative justify-center">
                                <TextInput
                                    value={formData.confirmPassword}
                                    onChangeText={(val) => setFormData({ ...formData, confirmPassword: val })}
                                    placeholder="••••••••"
                                    placeholderTextColor="#404040"
                                    // 2. Apply state here as well
                                    secureTextEntry={!showPassword}
                                    className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold pr-16"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="absolute right-4"
                                >
                                    <Text className="text-[10px] font-black uppercase italic text-red-600 tracking-tighter">
                                        {showPassword ? <EyeOff color="#525252" size={18} /> : <Eye color="#525252" size={18} />}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleUpdate}
                            disabled={loading || usernameStatus.available === false}
                            activeOpacity={0.8}
                            className={`bg-red-600 py-5 rounded-2xl flex-row items-center justify-center mt-4 ${(loading || usernameStatus.available === false) ? 'opacity-50' : ''
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-black uppercase italic tracking-widest">
                                    Apply Changes
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}