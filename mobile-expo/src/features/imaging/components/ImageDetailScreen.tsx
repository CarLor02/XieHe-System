import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import {
  Card,
  Content,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  SectionTitle,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import {
  formatDate,
  formatFileSize,
  imageStatusLabel,
} from '../domain/presentation';
import { savedMeasurements, savedReport } from '../domain/measurements';
import { ImageViewport } from './ImageViewport';
import { AnalysisSheet } from './AnalysisSheet';

export function ImageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const imageId = Number(id);
  const { services } = useWorkspace();
  const load = useCallback(
    () => services.imaging.get(imageId),
    [imageId, services]
  );
  const previewLoad = useCallback(
    () => services.preview(imageId),
    [imageId, services]
  );
  const resource = useResource(load);
  const preview = useResource(previewLoad);
  const image = resource.data;
  const measurements = image ? savedMeasurements(image) : [];
  const report = image ? savedReport(image) : '';
  return (
    <Screen>
      <Header
        title="影像详情"
        subtitle={image?.original_filename}
        back
        right={
          <IconButton
            name="refresh-outline"
            label="刷新影像"
            light
            onPress={() => {
              void resource.reload();
              void preview.reload();
            }}
          />
        }
      />
      {preview.data?.uri && (
        <ImageViewport key={preview.data.uri} uri={preview.data.uri} />
      )}
      <Content>
        {resource.loading && !image && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {preview.loading && !preview.data && (
          <LoadingState label="正在加载影像…" />
        )}
        {!!preview.error && (
          <ErrorState
            message={`影像预览：${preview.error}`}
            onRetry={() => void preview.reload()}
          />
        )}
        {preview.data?.isThumbnail && (
          <Notice>
            当前显示服务端预览图。原始 DICOM / TIFF
            的窗宽窗位调整与完整阅片请使用 Web 端。
          </Notice>
        )}
        {image && (
          <>
            <Card>
              <SectionTitle title="基本信息" />
              <InfoRow
                label="患者"
                value={image.patient_name || image.patient_identifier}
              />
              <InfoRow label="检查类型" value={image.description} />
              <InfoRow
                label="处理状态"
                value={imageStatusLabel(image.status)}
              />
              <InfoRow label="文件名" value={image.original_filename} />
              <InfoRow
                label="文件大小"
                value={formatFileSize(image.file_size)}
              />
              <InfoRow label="上传时间" value={formatDate(image.created_at)} />
              <InfoRow
                label="所属团队"
                value={image.team_names?.join('、') || '未分配团队'}
              />
            </Card>
            <Card>
              <SectionTitle title="已保存的测量" />
              {measurements.length ? (
                measurements.map((item, index) => (
                  <InfoRow
                    key={`${item.type}-${index}`}
                    label={item.description || item.type}
                    value={item.value || '未记录数值'}
                  />
                ))
              ) : (
                <EmptyState
                  title="暂无已保存的测量"
                  description="首版支持查看测量，手动标注请在 Web 端完成"
                  icon="analytics-outline"
                />
              )}
            </Card>
            {!!report && (
              <Card>
                <SectionTitle title="已保存的报告" />
                <Text selectable style={[layout.body, { marginTop: 14 }]}>
                  {report}
                </Text>
              </Card>
            )}
            <AnalysisSheet
              key={`${image.id}-${image.annotation_version}`}
              imageId={image.id}
              examType={image.description ?? ''}
              initialMeasurements={measurements}
            />
          </>
        )}
      </Content>
    </Screen>
  );
}
