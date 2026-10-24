import type { ImageFile } from '@xiehe/api-contracts';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tag } from '../../../shared/ui';
import { GradientIcon } from '../../../shared/ui/gradient-icon';
import { colors, layout } from '../../../shared/theme';

export function PendingTaskList({ images }: { images: ImageFile[] }) {
  return (
    <View>
      {images.map((image, index) => (
        <View key={image.id} style={[styles.row, index > 0 && styles.divider]}>
          <View style={styles.dot} />
          <View style={[layout.flex, { gap: 5, minWidth: 0 }]}>
            <View style={[layout.row, { gap: 6 }]}>
              <Text numberOfLines={1} style={styles.name}>
                {image.patient_name || image.original_filename}
              </Text>
              {!!image.description && (
                <Tag text={image.description} tone="teal" />
              )}
            </View>
            <Text numberOfLines={1} style={styles.meta}>
              {image.patient_identifier || '未关联患者'} ·{' '}
              {new Date(image.created_at).toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
              })}{' '}
              · 待处理
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`查看待处理影像 ${image.original_filename}`}
            onPress={() =>
              router.push({
                pathname: '/images/[id]',
                params: { id: image.id },
              })
            }
            style={styles.action}
          >
            <GradientIcon
              name="arrow-forward"
              colors={['#8B5CF6', '#9333EA']}
              size={36}
              iconSize={18}
              radius={12}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FB923C' },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
  meta: { fontSize: 10, color: colors.faint },
  action: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
