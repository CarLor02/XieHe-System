import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import {
  Card,
  Choice,
  ChoiceSheet,
  Content,
  EmptyState,
  ErrorState,
  Header,
  Icon,
  IconButton,
  LoadingState,
  Pagination,
  Screen,
  SearchField,
  Tag,
} from '../../../shared/ui';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { layout } from '../../../shared/theme';
import {
  reportStatuses,
  reportStatusLabel,
  useReports,
} from '../application/useReports';

export function ReportsScreen() {
  const { services } = useWorkspace();
  const { patientId, patientName } = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
  }>();
  const reports = useReports(
    services.reports,
    patientId ? Number(patientId) : undefined
  );
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <Screen>
      <Header
        title="诊断报告"
        subtitle={patientName || `共 ${reports.data?.total ?? 0} 份报告`}
        back
        right={
          <IconButton
            name="add"
            label="新建报告"
            light
            onPress={() =>
              router.push({
                pathname: '/reports/new',
                params: { patientId, patientName },
              })
            }
          />
        }
      >
        <SearchField
          value={reports.search}
          onChangeText={reports.searchFor}
          placeholder="搜索报告或患者"
        />
      </Header>
      <Content
        refreshControl={
          <RefreshControl
            refreshing={reports.loading && !!reports.data}
            onRefresh={() => void reports.reload()}
          />
        }
      >
        <FilterChip
          title={reportStatusLabel(reports.status)}
          icon="options-outline"
          active={!!reports.status}
          onPress={() => setFilterOpen(true)}
        />
        {reports.loading && !reports.data && <LoadingState />}
        {!!reports.error && (
          <ErrorState
            message={reports.error}
            onRetry={() => void reports.reload()}
          />
        )}
        {reports.data?.items.map(report => (
          <Pressable
            key={report.id}
            accessibilityRole="button"
            accessibilityLabel={`查看报告 ${report.report_title}`}
            onPress={() =>
              router.push({
                pathname: '/reports/detail',
                params: { id: report.id },
              })
            }
          >
            <Card>
              <View style={layout.row}>
                <Icon name="document-text-outline" />
                <View style={layout.flex}>
                  <Text style={layout.heading}>{report.report_title}</Text>
                  <Text style={layout.muted}>
                    {report.patient_name || `患者 ${report.patient_id}`} ·{' '}
                    {report.report_number}
                  </Text>
                </View>
                <Icon name="chevron-forward" />
              </View>
              <View style={layout.divider} />
              <Tag text={reportStatusLabel(report.status)} />
            </Card>
          </Pressable>
        ))}
        {reports.data?.total === 0 && <EmptyState title="暂无报告记录" />}
        {reports.data && (
          <Pagination
            page={reports.page}
            total={reports.data.total}
            loading={reports.loading}
            onChange={reports.setPage}
          />
        )}
      </Content>
      <ChoiceSheet
        open={filterOpen}
        title="报告状态"
        onClose={() => setFilterOpen(false)}
      >
        {reportStatuses.map(([key, label]) => (
          <Choice
            key={key}
            title={label}
            selected={reports.status === key}
            onPress={() => {
              reports.filter(key);
              setFilterOpen(false);
            }}
          />
        ))}
      </ChoiceSheet>
    </Screen>
  );
}
