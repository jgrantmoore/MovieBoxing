import { useLocalSearchParams } from 'expo-router';
import ProfileView from '../../../src/components/ProfileView';

export default function UserProfile() {
    const { id } = useLocalSearchParams();
    return <ProfileView userId={id as string} />;
}