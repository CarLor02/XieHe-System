import { useState } from 'react';
import type { ReportMeasurementItem } from '@xiehe/api-contracts';
import { getApiErrorMessage } from '@xiehe/api-client';
import { Share, Text, View } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import {
  Button,
  ChoiceSheet,
  ErrorState,
  InfoRow,
  LoadingState,
  Notice,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import { predictedMeasurements } from '../domain/measurements';

export function AnalysisSheet({
  imageId,
  examType,
  initialMeasurements,
}: {
  imageId: number;
  examType: string;
  initialMeasurements: ReportMeasurementItem[];
}) {
  const { services } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [report, setReport] = useState('');
  const [kind, setKind] = useState<'ai' | 'report'>('ai');
  const analyze = async () => {
    setOpen(true);
    setBusy(true);
    setError('');
    setKind('ai');
    setReport('');
    try {
      setMeasurements(
        predictedMeasurements(await services.imaging.predict(imageId), examType)
      );
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    const values = measurements.filter(item => item.value.trim());
    if (!values.length) {
      setOpen(true);
      setKind('report');
      setError(
        '暂无可用于生成报告的测量数值，请先在 Web 端完成测量，或运行 AI 测量'
      );
      return;
    }
    setOpen(true);
    setBusy(true);
    setError('');
    setKind('report');
    try {
      setReport(
        (
          await services.reports.generate({
            imageId: String(imageId),
            examType,
            measurements: values,
          })
        ).report
      );
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Button
        title="AI 自动测量"
        icon="sparkles-outline"
        onPress={() => void analyze()}
        loading={busy}
      />
      <Button
        title="生成报告预览"
        icon="document-text-outline"
        variant="secondary"
        onPress={() => void generate()}
        disabled={busy}
      />
      <ChoiceSheet
        title={kind === 'ai' ? 'AI 测量结果' : '报告预览'}
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        {busy ? (
          <LoadingState
            label={kind === 'ai' ? '正在分析影像，请稍候…' : '正在生成报告…'}
          />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Notice>
              本次结果仅供查看，尚未保存到影像标注。请在 Web
              端核对、编辑和保存。
            </Notice>
            {kind === 'ai' ? (
              <>
                {measurements.map((item, index) => (
                  <InfoRow
                    key={`${item.type}-${index}`}
                    label={item.description || item.type}
                    value={item.value || '未返回数值'}
                  />
                ))}
                {!measurements.length && (
                  <Text style={layout.muted}>接口未返回测量结果</Text>
                )}
                {!!measurements.length && (
                  <Button
                    title="使用这些结果生成报告"
                    icon="document-text-outline"
                    onPress={() => void generate()}
                  />
                )}
              </>
            ) : (
              <>
                <Text selectable style={layout.body}>
                  {report}
                </Text>
                {!!report && (
                  <Button
                    title="分享报告文字"
                    variant="secondary"
                    icon="share-outline"
                    onPress={() => {
                      void Share.share({ message: report }).catch(cause =>
                        setError(getApiErrorMessage(cause))
                      );
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </ChoiceSheet>
    </View>
  );
}
