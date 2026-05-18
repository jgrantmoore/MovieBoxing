import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how the app behaves when a notification is received while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // 1. Check if it's a physical device (Push notifications don't reliably work on iOS simulators)
  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return null;
  }

  // 2. Check and Request Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // 3. Get Expo Push Token
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '50892cbd-a5c3-4d85-8537-d4b0e6016059',
    })).data;
    console.log("Expo Push Token Generated:", token);
  } catch (error) {
    console.error("Error fetching Expo push token:", error);
  }

  // 4. Android Specific Channel Configuration
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#dc2626',
    });
  }

  return token;
}