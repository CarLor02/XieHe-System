import { Text } from 'react-native';
import { decodeAnnotationDocument } from '@xiehe/imaging-core/annotation-document';
import { useWorkspace } from '@/application/AppProvider';
import {
  Button,
  Card,
  ChoiceSheet,
  EmptyState,
  ErrorState,
  InfoRow,
  LoadingState,
  Pagination,
} from '@/shared/ui';
import { layout } from '@/shared/theme';
import { useAnnotationHistory } from '@/features/imaging/application/useAnnotationHistory';
import { formatDate } from '@/features/imaging/domain/presentation';

export function AnnotationHistorySheet({
  imageId,
  onClose,
}: {
  imageId: number;
  onClose: () => void;
}) {
  const { services } = useWorkspace();
  const state = useAnnotationHistory(services.imaging, imageId);
  const snapshot = state.detail.data
    ? decodeAnnotationDocument(state.detail.data.snapshot)
    : null;
  return (
    <ChoiceSheet
      open
      title={
        state.version === null ? '标注保存历史' : `标注版本 ${state.version}`
      }
      onClose={onClose}
    >
      {state.version === null ? (
        <>
          {state.list.loading && <LoadingState />}
          {!!state.list.error && (
            <ErrorState
              message={state.list.error}
              onRetry={() => void state.list.reload()}
            />
          )}
          {state.list.data?.items.map(item => (
            <Card key={item.version}>
              <InfoRow
                label={`版本 ${item.version}`}
                value={formatDate(item.created_at)}
              />
              <InfoRow label="来源" value={item.source} />
              <InfoRow label="原因" value={item.reason} />
              <Button
                title="查看版本内容"
                variant="secondary"
                onPress={() => state.setVersion(item.version)}
              />
            </Card>
          ))}
          {state.list.data?.total === 0 && <EmptyState title="暂无保存历史" />}
          {state.list.data && (
            <Pagination
              page={state.page}
              total={state.list.data.total}
              loading={state.list.loading}
              onChange={state.setPage}
            />
          )}
        </>
      ) : (
        <>
          <Button
            title="返回版本列表"
            variant="secondary"
            onPress={() => state.setVersion(null)}
          />
          {state.detail.loading && <LoadingState />}
          {!!state.detail.error && (
            <ErrorState
              message={state.detail.error}
              onRetry={() => void state.detail.reload()}
            />
          )}
          {snapshot?.measurements.map((measurement, index) => (
            <InfoRow
              key={`${measurement.id}-${index}`}
              label={measurement.description || measurement.type}
              value={measurement.value}
            />
          ))}
          <Text selectable style={layout.body}>
            {snapshot?.reportText || '该版本没有报告文字'}
          </Text>
          {!!state.detail.data && !snapshot && (
            <ErrorState message="该历史版本的标注格式无法读取" />
          )}
        </>
      )}
    </ChoiceSheet>
  );
}
