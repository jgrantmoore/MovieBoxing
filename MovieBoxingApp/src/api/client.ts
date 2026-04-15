import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://api.movieboxing.com/api';

/**
 * T is the expected return type of the JSON response.
 * It defaults to 'any' to maintain backward compatibility.
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {} // Using the built-in Fetch type instead of 'any'
): Promise<T> => {
  const token = await SecureStore.getItemAsync('userToken');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    await SecureStore.deleteItemAsync('userToken');
    // Optional: add navigation logic here to boot user to login
  }

  // Handle non-200 responses if you want them to throw
  if (!response.ok) {
    // 1. Try to get the error message from the body
    // Your backend sends plain text (e.g., "Email or username already in use.")
    const errorText = await response.text();

    // 2. Throw the actual message from the backend
    const error = new Error(errorText || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
};