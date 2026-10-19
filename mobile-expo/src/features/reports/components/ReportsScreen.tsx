import { useCallback, useState } from 'react';
import type { ReportSummary } from '@xiehe/api-contracts';
import { Pressable, Text, View } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import {
  Card,
  ChoiceSheet,
  Content,
  EmptyState,
  ErrorState,
  Header,
  Icon,
  InfoRow,
  LoadingState,
  Pagination,
  Screen,
  SearchField,
  Tag,
} from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';

export function ReportsScreen() {
  const { services } = useWorkspace();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReportSummary | null>(null);
  const query = useDebouncedValue(search);
  const load = useCallback(
    () =>
      services.reports.list({
        page,
        page_size: 20,
        search: query.trim() || undefined,
      }),
    [services, page, query]
  );
  const resource = useResource(load);
  return (
    <Screen>
      <Header
        title="诊断报告"
        subtitle={
          resource.data
            ? `共 ${resource.data.total} 份报告`
            : '查询后端报告记录'
        }
        back
      >
        <SearchField
          value={search}
          onChangeText={value => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索报告或患者"
        />
      </Header>
      <Content>
        {resource.loading && !resource.data && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {resource.data?.items.map(report => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`查看报告 ${report.report_title}`}
            key={report.id}
            onPress={() => setSelected(report)}
          >
            <Card>
              <View style={layout.row}>
                <Icon name="document-text-outline" />
                <View style={layout.flex}>
                  <Text style={layout.heading}>{report.report_title}</Text>
                  <Text style={[layout.muted, { marginTop: 7 }]}>
                    {report.patient_name || `患者 ${report.patient_id}`} ·{' '}
                    {report.report_number}
                  </Text>
                </View>
                <Icon name="chevron-forward" color={colors.faint} size={17} />
              </View>
              <View style={layout.divider} />
              <Tag text={report.status} tone="muted" />
            </Card>
          </Pressable>
        ))}
        {resource.data?.total === 0 && (
          <EmptyState
            title="暂无报告记录"
            description="报告会在后端生成并保存后显示在这里"
            icon="document-text-outline"
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
        open={!!selected}
        title="报告摘要"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <InfoRow label="标题" value={selected.report_title} />
            <InfoRow label="报告编号" value={selected.report_number} />
            <InfoRow label="患者" value={selected.patient_name} />
            <InfoRow label="状态" value={selected.status} />
            <InfoRow label="报告医师" value={selected.reporting_physician} />
            <InfoRow label="主要诊断" value={selected.primary_diagnosis} />
            <Text style={layout.muted}>
              完整报告编辑与审核请在 Web 端完成。
            </Text>
          </>
        )}
      </ChoiceSheet>
    </Screen>
  );
}
