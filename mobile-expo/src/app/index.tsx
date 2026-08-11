import { IMAGING_CORE_PACKAGE_NAME } from '@xiehe/imaging-core';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SHARED_BUSINESS_CONTEXT_COUNT } from '../application/sharedCapabilities';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>协和脊柱影像</Text>
      <Text style={styles.status}>{IMAGING_CORE_PACKAGE_NAME} 已连接</Text>
      <Text style={styles.status}>
        已复用 {SHARED_BUSINESS_CONTEXT_COUNT} 个公共业务上下文
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  status: {
    color: '#475569',
    fontSize: 14,
    marginTop: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '600',
  },
});
