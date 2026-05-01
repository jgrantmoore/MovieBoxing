import { Platform } from 'react-native';
import Constants from 'expo-constants';

// This check determines if we are running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

let GoogleSignin: any = {};
let statusCodes: any = {};

if (!isExpoGo) {
    // Only import the native library if we are NOT in Expo Go
    const NativeGoogle = require('@react-native-google-signin/google-signin');
    GoogleSignin = NativeGoogle.GoogleSignin;
    statusCodes = NativeGoogle.statusCodes;
} else {
    // Provide a "mock" version for Expo Go so the app doesn't crash
    GoogleSignin = {
        configure: () => console.log("Google Sign-In: Mock Configure (Expo Go)"),
        signIn: async () => {
            console.warn("Google Sign-In is not available in Expo Go.");
            return { data: { idToken: null } };
        },
        hasPlayServices: async () => true,
        getCurrentUser: () => null,
        signOut: async () => {},
        isSignedIn: async () => false,
    };
    statusCodes = {
        SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
        IN_PROGRESS: 'IN_PROGRESS',
    };
}

export { GoogleSignin, statusCodes };