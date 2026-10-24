import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, layout } from '../../theme';

export function LoadingState({ label = '正在加载…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Text style={layout.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    paddingVertical: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
});
