import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactUs() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.message) {
            Alert.alert("Ref Stopped the Fight", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            // FormSubmit allows AJAX submissions via JSON
            const response = await fetch("https://formsubmit.co/ajax/jgrantmoore17@gmail.com", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                Alert.alert("Victory!", "Your message has been sent to the commissioners.");
                setFormData({ name: '', email: '', message: '' });
            } else {
                throw new Error();
            }
        } catch (error) {
            Alert.alert("Arena Error", "Could not reach the server. Check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
            <ScrollView 
                className="flex-1 bg-slate-950 px-6 mt-12 mb-24"
                keyboardShouldPersistTaps="handled"
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
                        {/* Name Input */}
                        <View className="mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                Name
                            </Text>
                            <TextInput
                                value={formData.name}
                                onChangeText={(val) => setFormData({ ...formData, name: val })}
                                placeholder="Your Name"
                                placeholderTextColor="#404040"
                                className="w-full px-4 py-4 bg-black border border-neutral-800 rounded-2xl text-white font-bold"
                            />
                        </View>

                        {/* Email Input */}
                        <View className="mb-6">
                            <Text className="text-[10px] font-bold uppercase tracking-widest mb-2 text-neutral-400 ml-1">
                                Email
                            </Text>
                            <TextInput
                                value={formData.email}
                                onChangeText={(val) => setFormData({ ...formData, email: val })}
                                placeholder="Your Email"
                                placeholderTextColor="#404040"
                                keyboardType="email-address"
                                autoCapitalize="none"
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
        </SafeAreaView >
    );
}