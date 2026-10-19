import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { EXAM_TYPES } from '@xiehe/imaging-core';
import type { ImageFileStatus } from '@xiehe/api-contracts';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import {
  Button,
  Choice,
  ChoiceSheet,
  Content,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  LoadingState,
  Pagination,
  Screen,
  SearchField,
} from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';
import { imageStatusLabel } from '../domain/presentation';
import { ImageCard } from './ImageCard';

export function ImagesScreen({
  patientId,
  patientName,
}: {
  patientId?: number;
  patientName?: string;
}) {
  const { services } = useWorkspace();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState<ImageFileStatus>();
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<'type' | 'status' | null>(null);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      patientId
        ? services.imaging.listPatientImages(patientId, page, 20)
        : services.imaging.list({
            page,
            page_size: 20,
            search: query.trim() || undefined,
            description: type || undefined,
            file_status: status,
          }),
    [services, page, query, type, status, patientId]
  );
  const resource = useResource(load);
  return (
    <Screen>
      <Header
        title={patientId ? '患者影像' : '影像中心'}
        subtitle={
          patientId
            ? patientName
            : resource.data
              ? `${resource.data.total} 份影像`
              : '查看与管理检查影像'
        }
        back={!!patientId}
        right={
          <IconButton
            name="add"
            label="上传影像"
            light
            onPress={() =>
              router.push(
                patientId
                  ? {
                      pathname: '/images/upload',
                      params: { patientId, patientName },
                    }
                  : '/images/upload'
              )
            }
          />
        }
      >
        {!patientId && (
          <SearchField
            value={search}
            onChangeText={value => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="搜索患者姓名、编号或文件名"
          />
        )}
      </Header>
      <Content
        refreshControl={
          <RefreshControl
            refreshing={resource.loading && !!resource.data}
            onRefresh={() => void resource.reload()}
            tintColor={colors.primary}
          />
        }
      >
        {!patientId && (
          <View style={layout.row}>
            <Button
              compact
              title={type || '全部类型'}
              icon="options-outline"
              variant="secondary"
              onPress={() => setSheet('type')}
            />
            <Button
              compact
              title={status ? imageStatusLabel(status) : '全部状态'}
              icon="checkmark-circle-outline"
              variant="secondary"
              onPress={() => setSheet('status')}
            />
          </View>
        )}
        {!!patientId && resource.data && (
          <Text style={layout.muted}>共 {resource.data.total} 份检查影像</Text>
        )}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {resource.loading && !resource.data && <LoadingState />}
        {resource.data?.items.map(image => (
          <ImageCard key={image.id} image={image} />
        ))}
        {resource.data?.total === 0 && (
          <EmptyState
            title="没有匹配的影像"
            description="调整搜索条件，或上传新的检查影像"
            icon="images-outline"
          />
        )}
        {resource.data && (
          <Pagination
            page={page}
            total={resource.data.total}
            loading={resource.loading}
            onChange={setPage}
          />
        )}
      </Content>
      <ChoiceSheet
        title={sheet === 'type' ? '检查类型' : '处理状态'}
        open={!!sheet}
        onClose={() => setSheet(null)}
      >
        {sheet === 'type'
          ? ['', ...EXAM_TYPES].map(value => (
              <Choice
                key={value}
                title={value || '全部类型'}
                selected={value === type}
                onPress={() => {
                  setType(value);
                  setPage(1);
                  setSheet(null);
                }}
              />
            ))
          : [undefined, 'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'].map(
              value => (
                <Choice
                  key={value || 'all'}
                  title={
                    value
                      ? imageStatusLabel(value as ImageFileStatus)
                      : '全部状态'
                  }
                  selected={status === value}
                  onPress={() => {
                    setStatus(value as ImageFileStatus | undefined);
                    setPage(1);
                    setSheet(null);
                  }}
                />
              )
            )}
      </ChoiceSheet>
    </Screen>
  );
}

export function PatientImagesScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  return <ImagesScreen patientId={Number(id)} patientName={name} />;
}
