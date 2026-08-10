export function getExpoApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is required');
  }
  return apiBaseUrl;
}
