import type { DashboardActivity } from '@xiehe/api-contracts';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/shared/ui';
import { colors, layout, accents } from '@/shared/theme';

const appearance: Record<
  string,
  { icon: IconName; foreground: string; background: string }
> = {
  patient: {
    icon: 'person-add',
    foreground: accents.orange.foreground,
    background: accents.orange.background,
  },
  study: {
    icon: 'cloud-upload',
    foreground: colors.primary,
    background: colors.primaryLight,
  },
  report: {
    icon: 'document-text',
    foreground: accents.sky.foreground,
    background: accents.sky.background,
  },
};

export function ActivityList({
  activities,
}: {
  activities: DashboardActivity[];
}) {
  return (
    <View>
      {activities.map((activity, index) => {
        const style = appearance[activity.type || ''] || {
          icon: 'checkmark-circle' as const,
          foreground: colors.success,
          background: colors.successLight,
        };
        const date = new Date(activity.timestamp);
        const time = Number.isNaN(date.getTime())
          ? '时间未记录'
          : date.toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
        return (
          <Pressable
            key={`${activity.type}:${activity.id}`}
            accessibilityRole="button"
            accessibilityLabel={activity.title}
            onPress={() =>
              router.push(
                activity.type === 'patient'
                  ? '/patients'
                  : activity.type === 'report'
                    ? '/reports'
                    : '/images'
              )
            }
            style={[styles.row, index > 0 && styles.divider]}
          >
            <View style={[styles.icon, { backgroundColor: style.background }]}>
              <Icon name={style.icon} color={style.foreground} size={18} />
            </View>
            <View style={[layout.flex, { minWidth: 0 }]}>
              <Text style={styles.title} numberOfLines={1}>
                {activity.title}
              </Text>
              {!!activity.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {activity.description}
                </Text>
              )}
            </View>
            <Text style={styles.time}>{time}</Text>
            <Icon name="chevron-forward" color={colors.subtle} size={14} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13, fontWeight: '500', color: colors.text },
  description: { fontSize: 11, color: colors.faint, marginTop: 3 },
  time: { fontSize: 10, color: colors.faint, maxWidth: 66, textAlign: 'right' },
});
