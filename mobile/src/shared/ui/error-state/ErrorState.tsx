import { Text, View } from 'react-native';
import { fieldStyles, spacing } from '@/shared/theme';
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
      <View accessibilityRole="alert" style={{ gap: spacing.md }}>
        <Text style={fieldStyles.error}>{message}</Text>
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
