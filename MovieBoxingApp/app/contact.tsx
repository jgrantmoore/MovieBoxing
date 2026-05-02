import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';

export default function ContactUs() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { session, loading: authLoading } = useAuth();

    const [formData, setFormData] = useState({
        name: session?.user.displayName || '',
        email: session?.user.email || '',
        subject: '',
        message: ''
    });


    const handleSubmit = async () => {
        // Validation
        if (!formData.name || !formData.email || !formData.message) {
            Alert.alert("Ref Stopped the Fight", "Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            await apiRequest(`/contact/create`, {
                method: 'POST',
                body: JSON.stringify({ Name: formData.name, Email: formData.email, Subject: formData.subject || "Contact Via App", Message: formData.message })
            });
            Alert.alert("Victory!", "Your message has been sent. We'll get back to you soon!");
            setFormData({ name: '', email: '', subject: '', message: '' });
            router.back();
        } catch (error: any) {
            console.error("Contact Submission Error:", error);
            Alert.alert(
                "Arena Error",
                error.response?.data || "Could not reach the server. Check your connection."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    className="flex-1 px-6"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 60 }}
                >
                    <View className="py-12">
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
                                CONTACT <Text className="text-red-600">US</Text>
                            </Text>
                            <Text className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-2">
                                Have questions or feedback?
                            </Text>
                        </View>

                        <View className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-[2.5rem]">
                            {/* Locked Name Input */}
                            <View className="mb-6 opacity-60">
                                <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                    Your Name
                                </Text>
                                <TextInput
                                    value={formData.name}
                                    editable={false} // Prevents keyboard from opening
                                    selectTextOnFocus={false} // Prevents text selection
                                    className="w-full px-4 py-4 bg-neutral-950 border border-neutral-900 rounded-2xl text-neutral-400 font-bold"
                                />
                            </View>

                            {/* Locked Email Input */}
                            <View className="mb-6 opacity-60">
                                <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                    Your Email
                                </Text>
                                <TextInput
                                    value={formData.email}
                                    editable={false}
                                    className="w-full px-4 py-4 bg-neutral-950 border border-neutral-900 rounded-2xl text-neutral-400 font-bold"
                                />
                            </View>

                            {/* Optional Subject Input */}
                            <View className="mb-6">
                                <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                    Subject
                                </Text>
                                <TextInput
                                    value={formData.subject}
                                    onChangeText={(val) => setFormData({ ...formData, subject: val })}
                                    placeholder="What is this about?"
                                    placeholderTextColor="#404040"
                                    className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold"
                                />
                            </View>

                            {/* Message Input */}
                            <View className="mb-8">
                                <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                    Message
                                </Text>
                                <TextInput
                                    value={formData.message}
                                    onChangeText={(val) => setFormData({ ...formData, message: val })}
                                    placeholder="Your Message"
                                    placeholderTextColor="#404040"
                                    multiline
                                    numberOfLines={5}
                                    textAlignVertical="top"
                                    className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold min-h-[120px]"
                                />
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={loading}
                                activeOpacity={0.8}
                                className="bg-red-600 py-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-red-900/20"
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black uppercase italic tracking-widest">
                                        Send Message
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}