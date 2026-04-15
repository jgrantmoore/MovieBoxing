import { ActivityIndicator } from 'react-native/Libraries/Components/ActivityIndicator/ActivityIndicator';
import ProfileView from '../../../src/components/ProfileView';
import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function MyProfile() {
    const { session, loading } = useAuth();
    const router = useRouter();

    // 1. Handle loading state
    if (loading) return <ActivityIndicator />;

    // 2. SAFETY GUARD: If session is null, don't try to render the profile
    if (!session?.user) {
        // router.replace('/login'); // Redirect to login if not authenticated
        return null; // Don't render anything while redirecting
    }

    const MY_USER_ID = session.user.id; // Replace with actual logic to get logged-in user's ID

    return <ProfileView userId={MY_USER_ID} />;
}