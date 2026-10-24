import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <View accessibilityRole="alert" style={{ gap: 14 }}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry && (
          <Button
            title="重新加载"
            variant="secondary"
            icon="refresh-outline"
            compact
            onPress={onRetry}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  errorText: { fontSize: 13, lineHeight: 21, color: colors.danger },
});
