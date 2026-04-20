import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://api.movieboxing.com/api';

export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  // 1. Use the updated key name 'accessToken'
  let token = await SecureStore.getItemAsync('accessToken');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  // 2. HANDLE 401 (Token Expired)
  if (response.status === 401) {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');

    if (refreshToken) {
      try {
        // Attempt to get a new access token
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const { accessToken } = await refreshRes.json();
          
          // Save the new token
          await SecureStore.setItemAsync('accessToken', accessToken);

          // 3. RETRY the original request with the new token
          const retryHeaders: HeadersInit = {
            ...headers,
            Authorization: `Bearer ${accessToken}`,
          };

          response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders
          });
        } else {
          // Refresh token is also dead, force logout
          await clearAuthAndRedirect();
        }
      } catch (e) {
        await clearAuthAndRedirect();
      }
    } else {
      await clearAuthAndRedirect();
    }
  }

  // 4. Handle non-200 responses
  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || `Request failed: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  // Handle empty responses (like 204 No Content for logouts)
  if (response.status === 204) return {} as T;

  return response.json() as Promise<T>;
};

// Helper to clean up on total failure
const clearAuthAndRedirect = async () => {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('userData');
  // Optional: You could use an Event Emitter or a global navigation ref 
  // to push to /login here.
};