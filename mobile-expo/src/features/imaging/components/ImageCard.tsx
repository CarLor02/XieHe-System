import { useState } from 'react';
import type { ImageFile } from '@xiehe/api-contracts';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Icon, Tag } from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';
import { formatDate, imageStatusLabel } from '../domain/presentation';

export function ImageCard({
  image,
  thumbnailUri,
  onOpenOriginal,
  onDelete,
  busy = false,
  compact = false,
}: {
  image: ImageFile;
  thumbnailUri?: string;
  onOpenOriginal?: () => void;
  onDelete?: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  const open = () =>
    router.push({ pathname: '/images/[id]', params: { id: image.id } });
  const tone = image.description?.includes('侧位')
    ? 'sky'
    : image.description?.includes('左')
      ? 'teal'
      : image.description?.includes('右')
        ? 'indigo'
        : 'primary';
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看影像 ${image.original_filename}`}
        onPress={open}
        style={[styles.information, compact && { marginBottom: 0 }]}
      >
        <View style={styles.thumbnail}>
          {thumbnailUri && failedUri !== thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory"
              onError={() => setFailedUri(thumbnailUri)}
              accessibilityLabel={`${image.description || '影像'}缩略图`}
            />
          ) : (
            <>
              <Icon name="scan-outline" color="#C4B5FD" size={25} />
              <Text style={styles.fileType}>{image.file_type}</Text>
            </>
          )}
        </View>
        <View style={[layout.flex, { minWidth: 0, gap: 7 }]}>
          <Text numberOfLines={1} style={styles.name}>
            {image.original_filename}
          </Text>
          <View style={[layout.row, { gap: 6, flexWrap: 'wrap' }]}>
            <Tag text={image.description || '未填写类型'} tone={tone} dot />
            <Tag
              text={imageStatusLabel(image.status)}
              tone={
                image.status === 'FAILED'
                  ? 'danger'
                  : image.status === 'PROCESSED' || image.status === 'UPLOADED'
                    ? 'success'
                    : 'warning'
              }
            />
          </View>
          <View style={[layout.row, { gap: 4 }]}>
            <Icon name="time-outline" color={colors.faint} size={11} />
            <Text style={styles.date} numberOfLines={1}>
              {formatDate(image.uploaded_at || image.created_at)}
            </Text>
          </View>
        </View>
      </Pressable>
      {!compact && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`分析影像 ${image.original_filename}`}
            onPress={open}
            style={layout.flex}
          >
            <LinearGradient
              colors={['#8B5CF6', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyze}
            >
              <View style={styles.sparkles}>
                <Icon name="sparkles-outline" color="#FFF" size={13} />
              </View>
              <Text style={styles.analyzeLabel}>影像分析</Text>
              <Icon name="arrow-forward" color="#FFFFFFB3" size={13} />
            </LinearGradient>
          </Pressable>
          {onOpenOriginal && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`打开原始文件 ${image.original_filename}`}
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={onOpenOriginal}
              style={styles.actionButton}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.faint} />
              ) : (
                <Icon name="download-outline" color={colors.faint} size={18} />
              )}
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`删除影像 ${image.original_filename}`}
              onPress={onDelete}
              style={[styles.actionButton, styles.delete]}
            >
              <Icon name="trash-outline" color="#F87171" size={18} />
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  information: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 3,
  },
  fileType: { fontSize: 8, color: '#CBD5E1' },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  date: { fontSize: 11, color: colors.faint, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyze: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 16,
    boxShadow: '0 3px 6px rgba(139,92,246,0.2)',
  },
  sparkles: {
    width: 20,
    height: 20,
    borderRadius: 7,
    backgroundColor: '#FFFFFF33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeLabel: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  delete: { backgroundColor: '#FEF2F2', borderColor: '#FEF2F2' },
});
