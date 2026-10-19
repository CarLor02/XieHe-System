import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
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
import { PatientCard } from './PatientCard';

export function PatientsScreen() {
  const { services } = useWorkspace();
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      services.patients.list({
        page,
        page_size: 20,
        search: query.trim() || undefined,
        gender: gender || undefined,
      }),
    [services, page, query, gender]
  );
  const resource = useResource(load);
  return (
    <Screen>
      <Header
        title="患者中心"
        subtitle={
          resource.data
            ? `${resource.data.total} 位患者`
            : '管理患者档案与检查记录'
        }
        right={
          <IconButton
            name="add"
            label="新增患者"
            light
            onPress={() => router.push('/patients/new')}
          />
        }
      >
        <SearchField
          value={search}
          onChangeText={value => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索姓名、患者编号或手机号"
        />
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
        <View style={layout.between}>
          <Button
            compact
            title={gender || '全部性别'}
            variant="secondary"
            icon="filter-outline"
            onPress={() => setFilterOpen(true)}
          />
          <Text style={layout.muted}>下拉刷新</Text>
        </View>
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {resource.loading && !resource.data && <LoadingState />}
        {resource.data?.items.map(patient => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
        {resource.data?.total === 0 && (
          <EmptyState
            title="未找到患者"
            description="试试其他关键词，或建立新的患者档案"
            icon="people-outline"
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
        open={filterOpen}
        title="选择性别"
        onClose={() => setFilterOpen(false)}
      >
        {['', '男', '女', '未知'].map(item => (
          <Choice
            key={item}
            title={item || '全部性别'}
            selected={gender === item}
            onPress={() => {
              setGender(item);
              setPage(1);
              setFilterOpen(false);
            }}
          />
        ))}
      </ChoiceSheet>
    </Screen>
  );
}
