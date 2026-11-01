import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { VertebraLabelOffsetDirection } from '@xiehe/imaging-core/keypoints';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import { getVertebraOptions } from '@/features/image-editor/application/editorToolQueries';
import { EditorSelectField } from './EditorSelectField';
import { EditorButton } from './EditorButton';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function EditorLabelOffset({
  session,
  error,
  onApplied,
}: {
  session: ImageEditorSession;
  error: string;
  onApplied: () => void;
}) {
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [direction, setDirection] =
    useState<VertebraLabelOffsetDirection>('up');
  const [offset, setOffset] = useState('1');
  const options = getVertebraOptions(session.context.examType).map(value => ({
    label: value,
    value,
  }));
  const disabled = !session.editable;
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.title}>椎体序号偏移纠正</Text>
      <EditorSelectField
        label="起始椎体"
        value={start}
        options={options}
        onChange={setStart}
        disabled={disabled}
      />
      <EditorSelectField
        label="结束椎体"
        value={end}
        options={options}
        onChange={setEnd}
        disabled={disabled}
      />
      <EditorSelectField<VertebraLabelOffsetDirection>
        label="偏移方向"
        value={direction}
        options={[
          { value: 'up', label: '上移' },
          { value: 'down', label: '下移' },
        ]}
        onChange={setDirection}
        disabled={disabled}
      />
      <View style={s.row}>
        <Text style={s.muted}>偏移量</Text>
        <TextInput
          accessibilityLabel="偏移量"
          value={offset}
          onChangeText={setOffset}
          keyboardType="number-pad"
          editable={!disabled}
          style={[s.field, { flex: 1 }]}
        />
      </View>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.danger, fontSize: 12, lineHeight: 18 }}
        >
          {error}
        </Text>
      )}
      <EditorButton
        label="应用纠正"
        primary
        disabled={disabled || !start || !end}
        onPress={() => {
          if (
            start &&
            end &&
            session.offsetVertebrae({
              startVertebra: start,
              endVertebra: end,
              direction,
              offset: Number(offset),
            })
          )
            onApplied();
        }}
      />
    </View>
  );
}
