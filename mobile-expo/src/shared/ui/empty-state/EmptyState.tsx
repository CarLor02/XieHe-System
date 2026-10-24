import { StyleSheet, Text, View } from 'react-native';
import { colors, layout } from '../../theme';
import { Icon, type IconName } from '../icon';
import { Button } from '../button';

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionText,
  onAction,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={32} />
      </View>
      <Text style={layout.heading}>{title}</Text>
      {!!description && (
        <Text style={[layout.muted, { textAlign: 'center' }]}>
          {description}
        </Text>
      )}
      {!!actionText && onAction && (
        <Button
          title={actionText}
          onPress={onAction}
          variant="secondary"
          compact
          icon="refresh-outline"
        />
      )}
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
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
