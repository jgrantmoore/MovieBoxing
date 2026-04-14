import ProfileView from '../../../src/components/ProfileView';
import { useAuth } from '../../../src/context/AuthContext';

export default function MyProfile() {
    const { session } = useAuth();

    // In a real app, you'd get the 'me' ID from your Auth Provider/Context
    // Assuming '1' is the logged-in user for now based on your previous code
    const MY_USER_ID = session.user.id; // Replace with actual logic to get logged-in user's ID
    
    return <ProfileView userId={MY_USER_ID} />;
}