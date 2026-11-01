import type { ImageFile } from '@xiehe/api-contracts';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/theme';
import {
  formatDate,
  formatFileSize,
  imageTeamLabel,
  truncateImageLabel,
} from '@/features/imaging/domain/presentation';

function Metadata({
  label,
  value,
  truncate = false,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}：</Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        accessibilityLabel={`${label}：${value}`}
        style={styles.value}
      >
        {truncate ? truncateImageLabel(value) : value}
      </Text>
    </View>
  );
}

export function ImageCardMetadata({ image }: { image: ImageFile }) {
  return (
    <View style={styles.details}>
      <View style={styles.row}>
        <Metadata
          label="患者"
          value={image.patient_name?.trim() || '未知患者'}
          truncate
        />
        <Metadata
          label="上传者"
          value={image.uploader_name?.trim() || '未知用户'}
          truncate
        />
      </View>
      <View style={styles.row}>
        <Metadata label="归属团队" value={imageTeamLabel(image)} truncate />
        <Metadata label="文件大小" value={formatFileSize(image.file_size)} />
      </View>
      <View style={styles.row}>
        <Metadata label="上传日期" value={formatDate(image.created_at)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  details: { gap: 9, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  label: { flexShrink: 0, fontSize: 11, lineHeight: 16, color: colors.muted },
  value: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
