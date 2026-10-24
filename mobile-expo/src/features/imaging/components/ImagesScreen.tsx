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
import { FilterChip } from '../../../shared/ui/filter-chip';
import { useImageThumbnails } from '../application/useImageThumbnails';
import { useImageActions } from '../application/useImageActions';
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
  const thumbnails = useImageThumbnails(resource.data?.items);
  const actions = useImageActions(() => {
    if (resource.data?.items.length === 1 && page > 1) setPage(page - 1);
    else void resource.reload();
  });
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
            placeholder="搜索患者姓名、检查类型或文件名"
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
            <FilterChip
              title={type || '全部类型'}
              icon="options-outline"
              active={!!type}
              onPress={() => setSheet('type')}
            />
            <FilterChip
              title={status ? imageStatusLabel(status) : '全部状态'}
              icon="checkmark-circle-outline"
              active={!!status}
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
        {!!actions.error && !actions.target && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {actions.error}
          </Text>
        )}
        <View style={{ gap: 12 }}>
          {resource.data?.items.map(image => (
            <ImageCard
              key={image.id}
              image={image}
              thumbnailUri={thumbnails[image.id]?.url}
              busy={actions.busyId === image.id}
              onOpenOriginal={() => void actions.openOriginal(image)}
              onDelete={() => actions.selectDelete(image)}
            />
          ))}
        </View>
        {resource.data?.total === 0 && (
          <EmptyState
            title="未找到匹配的影像"
            description="试试调整搜索关键词或筛选条件"
            icon="images-outline"
            actionText={patientId ? undefined : '清除筛选'}
            onAction={() => {
              setSearch('');
              setType('');
              setStatus(undefined);
              setPage(1);
            }}
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
        open={!!actions.target}
        title="删除这份影像？"
        onClose={actions.closeDelete}
      >
        <Text style={layout.body}>
          确认删除《{actions.target?.original_filename}
          》？删除后将不再显示在影像中心。
        </Text>
        {!!actions.error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {actions.error}
          </Text>
        )}
        <Button
          title="确认删除"
          variant="danger"
          loading={actions.deleting}
          onPress={() => void actions.confirmDelete()}
        />
        <Button
          title="取消"
          variant="ghost"
          disabled={actions.deleting}
          onPress={actions.closeDelete}
        />
      </ChoiceSheet>
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
