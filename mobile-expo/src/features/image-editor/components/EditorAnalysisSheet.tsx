import { Share, Text } from 'react-native';
import { useState } from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';
import {
  Button,
  ChoiceSheet,
  ErrorState,
  Field,
  InfoRow,
  Notice,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import type {
  ImageEditorSession,
  EditorState,
} from '../application/ImageEditorSession';

export function EditorAnalysisSheet({
  session,
  state,
  open,
  onClose,
  onAnalyze,
}: {
  session: ImageEditorSession;
  state: EditorState;
  open: boolean;
  onClose: () => void;
  onAnalyze: () => void;
}) {
  const [shareError, setShareError] = useState('');
  const blocked = !session.editable || !!state.drawing || state.dragging;
  return (
    <ChoiceSheet open={open} title="AI 测量与报告" onClose={onClose}>
      <Notice>
        AI 结果会替换当前测量和点位；核对、修改后点击保存，才会写入服务器。
      </Notice>
      <Button
        title="AI 自动测量"
        icon="sparkles-outline"
        onPress={onAnalyze}
        disabled={!session.canAnalyze}
        loading={state.working === 'ai'}
      />
      {(session.snapshot?.measurements ?? [])
        .filter(m => m.value)
        .map(m => (
          <InfoRow key={m.id} label={m.description || m.type} value={m.value} />
        ))}
      <Button
        title="根据当前测量生成报告"
        icon="document-text-outline"
        onPress={() => void session.generateReport()}
        disabled={blocked}
        loading={state.working === 'report'}
      />
      {!!state.error && <ErrorState message={state.error} />}
      {!!state.message && <Text style={layout.muted}>{state.message}</Text>}
      <Field
        label="影像报告"
        multiline
        value={state.reportText}
        onChangeText={text => session.setReportText(text)}
        editable={!blocked}
        style={{ minHeight: 160, textAlignVertical: 'top' }}
        placeholder="根据测量生成报告，或填写报告内容"
      />
      <Button
        title="保存标注与报告"
        onPress={() => void session.save()}
        loading={state.saving}
        disabled={blocked}
      />
      {!!state.reportText && (
        <Button
          title="分享报告文字"
          variant="secondary"
          onPress={() => {
            setShareError('');
            void Share.share({ message: state.reportText }).catch(cause =>
              setShareError(getApiErrorMessage(cause))
            );
          }}
        />
      )}
      {!!shareError && <ErrorState message={shareError} />}
    </ChoiceSheet>
  );
}
