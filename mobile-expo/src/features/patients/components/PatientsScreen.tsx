import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useWorkspace } from '../../../application/AppProvider';
import { usePatientList } from '../application/usePatientList';
import {
  Content,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  LoadingState,
  Pagination,
  Screen,
  SearchField,
  SelectionSheet,
} from '../../../shared/ui';
import { colors } from '../../../shared/theme';
import { FilterChip } from '../../../shared/ui/filter-chip';
import { PatientCard } from './PatientCard';
import { genderFilterOptions } from './patientSelectionOptions';

export function PatientsScreen() {
  const { services } = useWorkspace();
  const [filterOpen, setFilterOpen] = useState(false);
  const {
    search,
    gender,
    page,
    setPage,
    resource,
    changeSearch,
    changeGender,
    clearFilters,
  } = usePatientList(services.patients);
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
          onChangeText={changeSearch}
          placeholder="搜索患者姓名、ID或手机号"
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
        <View>
          <FilterChip
            title={`性别: ${gender || '全部'}`}
            active={!!gender}
            icon="filter-outline"
            onPress={() => setFilterOpen(true)}
          />
        </View>
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {resource.loading && !resource.data && <LoadingState />}
        <View style={{ gap: 8 }}>
          {resource.data?.items.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </View>
        {resource.data?.total === 0 && (
          <EmptyState
            title="未找到匹配的患者"
            description="试试调整搜索关键词或筛选条件"
            icon="people-outline"
            actionText="清除筛选"
            onAction={clearFilters}
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
      <SelectionSheet
        open={filterOpen}
        title="选择性别"
        options={genderFilterOptions}
        value={gender}
        onChange={changeGender}
        onClose={() => setFilterOpen(false)}
      />
    </Screen>
  );
}
