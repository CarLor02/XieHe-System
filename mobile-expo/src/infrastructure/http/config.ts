export function getExpoApiBaseUrl(): string {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return apiBaseUrl || 'https://xiehe.stellarmesh.cn';
}
