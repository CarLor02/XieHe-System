import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { Button, Card, IconButton, SectionTitle, Tag } from '@/shared/ui';
import { colors, layout } from '@/shared/theme';
import type { ImageUploadEntry } from '@/features/imaging/domain/uploadEntry';
import { formatFileSize } from '@/features/imaging/domain/presentation';

export function UploadImageList({
  entries,
  busy,
  onEdit,
  onRemove,
  onRetry,
  onClear,
}: {
  entries: ImageUploadEntry[];
  busy: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onClear: () => void;
}) {
  if (!entries.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={layout.between}>
        <SectionTitle title={`已选择 ${entries.length} 张影像`} />
        <Button
          compact
          title="清空列表"
          variant="ghost"
          disabled={busy}
          onPress={onClear}
        />
      </View>
      {entries.map(entry => (
        <Card key={entry.id} style={{ gap: 12 }}>
          <View style={[layout.row, { alignItems: 'flex-start' }]}>
            <Image
              source={{ uri: entry.file.uri }}
              contentFit="contain"
              style={{
                width: 76,
                height: 88,
                borderRadius: 10,
                backgroundColor: colors.inverseSurface,
              }}
            />
            <View style={[layout.flex, { minWidth: 0, gap: 6 }]}>
              <Text numberOfLines={2} style={layout.body}>
                {entry.file.name}
              </Text>
              <Text style={layout.muted}>
                {formatFileSize(entry.file.size)} · {entry.examType}
              </Text>
              <Text numberOfLines={1} style={layout.muted}>
                {entry.teams.map(team => team.name).join('、') || '未分配团队'}
              </Text>
              <View style={[layout.row, { flexWrap: 'wrap' }]}>
                <Tag
                  text={
                    entry.status === 'completed'
                      ? '上传完成'
                      : entry.status === 'error'
                        ? '上传失败'
                        : entry.status === 'uploading'
                          ? `上传中 ${entry.progress}%`
                          : '待上传'
                  }
                  tone={
                    entry.status === 'completed'
                      ? 'success'
                      : entry.status === 'error'
                        ? 'danger'
                        : 'muted'
                  }
                />
                {entry.flipped && <Text style={layout.muted}>已翻转</Text>}
                {entry.cropped && <Text style={layout.muted}>已裁剪</Text>}
              </View>
            </View>
            <IconButton
              name="close"
              label={`移除 ${entry.file.name}`}
              disabled={busy}
              onPress={() => onRemove(entry.id)}
            />
          </View>
          {entry.status === 'uploading' && (
            <View
              style={{
                height: 5,
                backgroundColor: colors.primaryLight,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${entry.progress}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          )}
          {!!entry.error && (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {entry.error}
            </Text>
          )}
          {entry.status !== 'completed' && (
            <View style={layout.row}>
              <View style={layout.flex}>
                <Button
                  compact
                  title="调整影像"
                  icon="options-outline"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => onEdit(entry.id)}
                />
              </View>
              {entry.status === 'error' && (
                <View style={layout.flex}>
                  <Button
                    compact
                    title="重试上传"
                    icon="refresh-outline"
                    disabled={busy}
                    onPress={() => onRetry(entry.id)}
                  />
                </View>
              )}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}
