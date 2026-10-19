import { Stack } from 'expo-router';

export default function WorkspaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="images/upload" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
