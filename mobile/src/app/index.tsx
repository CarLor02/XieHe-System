import { Redirect } from 'expo-router';
import { useApp } from '@/application/AppProvider';

export default function HomeScreen() {
  const { session } = useApp();
  return <Redirect href={session ? '/(main)/(tabs)' : '/login'} />;
}
