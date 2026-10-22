import { useState } from 'react';
import { Share, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReportResponse } from '@xiehe/api-contracts/generated';
import { useWorkspace } from '../../../application/AppProvider';
import { useDraftNavigation } from '../../../shared/hooks/useDraftNavigation';
import {
  Button,
  Card,
  Choice,
  ChoiceSheet,
  Content,
  ErrorState,
  Field,
  FormContent,
  Header,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  SectionTitle,
} from '../../../shared/ui';
import { PatientPicker } from '../../patients';
import { reportFields } from '../application/reportForm';
import {
  useReportDraft,
  useReportEditor,
} from '../application/useReportEditor';
import { reportStatusLabel } from '../application/useReports';
import { layout } from '../../../shared/theme';

export function ReportDetailScreen() {
  const { id, patientId, patientName } = useLocalSearchParams<{
    id?: string;
    patientId?: string;
    patientName?: string;
  }>();
  const { services } = useWorkspace();
  const resource = useReportEditor(
    services.reports,
    id ? Number(id) : undefined
  );
  if (resource.data !== undefined)
    return (
      <ReportForm
        key={resource.data?.id ?? 'new'}
        source={resource.data}
        patientId={patientId ? Number(patientId) : undefined}
        patientName={patientName}
      />
    );
  return (
    <Screen>
      <Header title="诊断报告" back />
      <Content>
        {resource.loading ? (
          <LoadingState />
        ) : (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
      </Content>
    </Screen>
  );
}
function ReportForm({
  source,
  patientId,
  patientName,
}: {
  source: ReportResponse | null;
  patientId?: number;
  patientName?: string;
}) {
  const { services } = useWorkspace();
  const form = useReportDraft(services.reports, source, patientId, patientName);
  const [sheet, setSheet] = useState<'patient' | 'delete' | null>(null);
  const [editing, setEditing] = useState(!source);
  const leave = useDraftNavigation(form.dirty, form.mutation.busy);
  const report = form.current;
  return (
    <Screen>
      <Header
        title={report ? '诊断报告' : '新建报告'}
        subtitle={report?.report_number}
        back
      />
      <FormContent>
        <Card>
          <SectionTitle title="患者信息" />
          <InfoRow label="患者" value={form.patient?.name} />
          {report ? (
            <>
              <InfoRow label="状态" value={reportStatusLabel(report.status)} />
              <InfoRow label="审核医师" value={report.reviewed_by} />
              <InfoRow label="审核日期" value={report.reviewed_at} />
            </>
          ) : (
            <Button
              title="选择患者"
              variant="secondary"
              disabled={form.mutation.busy}
              onPress={() => setSheet('patient')}
            />
          )}
        </Card>
        {editing ? (
          <Card style={{ gap: 14 }}>
            <Field
              label="报告标题"
              value={form.draft.report_title}
              maxLength={200}
              editable={!form.mutation.busy}
              onChangeText={value =>
                form.setDraft(draft => ({ ...draft, report_title: value }))
              }
            />
            <Text style={layout.label}>优先级</Text>
            {[
              ['normal', '普通'],
              ['low', '低'],
              ['high', '高'],
              ['urgent', '紧急'],
            ].map(([key, label]) => (
              <Choice
                key={key}
                title={label}
                selected={form.draft.priority === key}
                onPress={() => {
                  if (!form.mutation.busy)
                    form.setDraft(draft => ({ ...draft, priority: key }));
                }}
              />
            ))}
          </Card>
        ) : (
          <Card>
            <Text style={layout.heading}>{form.draft.report_title}</Text>
          </Card>
        )}
        {reportFields.map(([key, title]) => (
          <Card key={key}>
            {editing ? (
              <Field
                label={title}
                multiline
                value={form.draft[key]}
                editable={!form.mutation.busy}
                onChangeText={value =>
                  form.setDraft(draft => ({ ...draft, [key]: value }))
                }
              />
            ) : (
              <>
                <SectionTitle title={title} />
                <Text selectable style={layout.body}>
                  {form.draft[key] || '未填写'}
                </Text>
              </>
            )}
          </Card>
        ))}
        {!!form.mutation.error && <ErrorState message={form.mutation.error} />}
        {!!form.mutation.message && <Notice>{form.mutation.message}</Notice>}
        {editing ? (
          <Button
            title="保存报告"
            loading={form.mutation.busy}
            onPress={() =>
              void form.save().then(ok => {
                if (ok) setEditing(false);
              })
            }
          />
        ) : (
          <Button
            title="编辑报告"
            icon="create-outline"
            onPress={() => setEditing(true)}
            disabled={form.mutation.busy}
          />
        )}
        <Button
          title="分享报告文字"
          variant="secondary"
          disabled={form.mutation.busy}
          onPress={() =>
            void form.mutation.run(
              () =>
                Share.share({
                  message: [
                    form.draft.report_title,
                    ...reportFields.map(
                      ([key, label]) =>
                        `${label}\n${form.draft[key] || '未填写'}`
                    ),
                  ].join('\n\n'),
                }),
              undefined,
              ''
            )
          }
        />
        {!!report && (
          <Button
            title="删除报告"
            variant="danger"
            disabled={form.mutation.busy || form.dirty}
            onPress={() => setSheet('delete')}
          />
        )}
      </FormContent>
      <ChoiceSheet
        open={sheet === 'patient'}
        title="选择患者"
        onClose={() => setSheet(null)}
      >
        {sheet === 'patient' && (
          <PatientPicker
            selectedId={form.patient?.id}
            onSelect={patient => {
              form.setPatient(patient);
              setSheet(null);
            }}
          />
        )}
      </ChoiceSheet>
      <ChoiceSheet
        open={sheet === 'delete'}
        title="删除报告？"
        onClose={() => {
          if (!form.mutation.busy) setSheet(null);
        }}
      >
        <Text style={layout.body}>确认删除《{report?.report_title}》？</Text>
        {!!form.mutation.error && <ErrorState message={form.mutation.error} />}
        <Button
          title="确认删除"
          variant="danger"
          loading={form.mutation.busy}
          onPress={() => void form.remove(() => router.back())}
        />
      </ChoiceSheet>
      <ChoiceSheet
        open={leave.open}
        title="放弃未保存的报告修改？"
        onClose={leave.cancel}
      >
        <Button title="继续编辑" onPress={leave.cancel} />
        <Button title="放弃并离开" variant="danger" onPress={leave.discard} />
      </ChoiceSheet>
    </Screen>
  );
}
