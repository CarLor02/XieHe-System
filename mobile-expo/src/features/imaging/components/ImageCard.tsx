import type { ImageFile } from '@xiehe/api-contracts';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, Icon, Tag } from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';
import { formatDate, imageStatusLabel } from '../domain/presentation';

export function ImageCard({
  image,
  compact = false,
}: {
  image: ImageFile;
  compact?: boolean;
}) {
  const open = () =>
    router.push({ pathname: '/images/[id]', params: { id: image.id } });
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看影像 ${image.original_filename}`}
        onPress={open}
        style={layout.row}
      >
        <View
          style={{
            width: 54,
            height: 62,
            borderRadius: 13,
            backgroundColor: '#182033',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Icon name="scan-outline" color="#B4A3E8" size={27} />
          <Text style={{ fontSize: 8, color: '#9DABC2' }}>
            {image.file_type}
          </Text>
        </View>
        <View style={[layout.flex, { gap: 7 }]}>
          <Text numberOfLines={1} style={[layout.heading, { fontSize: 14 }]}>
            {image.original_filename}
          </Text>
          <View style={[layout.row, { gap: 6, flexWrap: 'wrap' }]}>
            <Tag text={image.description || '检查类型未填写'} />
            <Tag
              text={imageStatusLabel(image.status)}
              tone={
                image.status === 'FAILED'
                  ? 'danger'
                  : image.status === 'PROCESSED'
                    ? 'success'
                    : 'warning'
              }
            />
          </View>
          <Text style={layout.muted}>
            {image.patient_name || image.patient_identifier || '未关联患者'}
          </Text>
        </View>
        <Icon name="chevron-forward" size={16} color={colors.faint} />
      </Pressable>
      {!compact && (
        <>
          <View style={layout.divider} />
          <View style={[layout.between, { marginBottom: 12 }]}>
            <Text style={[layout.muted, { fontSize: 11 }]}>
              {formatDate(image.created_at)}
            </Text>
            {image.has_annotation && <Tag text="已有标注" tone="success" />}
          </View>
          <Button
            title="查看影像与测量"
            icon="expand-outline"
            compact
            onPress={open}
          />
        </>
      )}
    </Card>
  );
}
