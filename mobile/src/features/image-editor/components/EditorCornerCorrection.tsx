import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VertebraCornerSequenceNumber } from '@xiehe/imaging-core/keypoints';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import { getRectificationGroups } from '@/features/image-editor/application/editorToolQueries';
import { Icon } from '@/shared/ui';
import { EditorButton } from './EditorButton';
import { EditorSelectField } from './EditorSelectField';
import { editorColors as c, editorStyles as s } from './editorTheme';

const sequenceNumbers = [1, 2, 3, 4] as const;
const initialMapping = { 1: 1, 2: 2, 3: 3, 4: 4 } as const;

export function EditorCornerCorrection({
  session,
  error,
  onApplied,
}: {
  session: ImageEditorSession;
  error: string;
  onApplied: () => void;
}) {
  const [vertebra, setVertebra] = useState<string | null>(null);
  const [targets, setTargets] =
    useState<
      Record<VertebraCornerSequenceNumber, VertebraCornerSequenceNumber>
    >(initialMapping);
  const groups = session.snapshot
    ? getRectificationGroups(session.snapshot, session.context.examType)
    : [];
  const selected = groups.find(group => group.name === vertebra);
  const disabled = !session.editable;
  return (
    <View style={styles.section}>
      {selected ? (
        <>
          <EditorButton
            label="返回椎体列表"
            icon="arrow-back"
            onPress={() => setVertebra(null)}
          />
          <Text style={s.title}>纠正{selected.name}的序号</Text>
          {sequenceNumbers.map(from => (
            <EditorSelectField
              key={from}
              label={`${selected.name}-${from} 修改后序号`}
              value={targets[from]}
              options={sequenceNumbers.map(value => ({
                value,
                label: `${selected.name}-${value}`,
              }))}
              onChange={to =>
                setTargets(current => ({ ...current, [from]: to }))
              }
              disabled={disabled}
            />
          ))}
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <EditorButton
            label="应用修改"
            primary
            disabled={disabled || !selected.complete}
            onPress={() => {
              if (
                session.rectifyVertebra(
                  selected.name,
                  sequenceNumbers.map(from => ({ from, to: targets[from] }))
                )
              )
                onApplied();
            }}
          />
        </>
      ) : (
        <>
          <Text style={s.title}>椎体内纠正</Text>
          <View style={styles.grid}>
            {groups.map(group => (
              <View key={group.id} style={styles.slot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`纠正椎体 ${group.name}`}
                  accessibilityHint={
                    group.complete ? undefined : '四个关键点尚不完整'
                  }
                  accessibilityState={{ disabled: disabled || !group.complete }}
                  disabled={disabled || !group.complete}
                  style={[
                    styles.group,
                    (disabled || !group.complete) && styles.disabled,
                  ]}
                  onPress={() => {
                    setTargets(initialMapping);
                    setVertebra(group.name);
                  }}
                >
                  <Icon name="locate-outline" color={c.blueLight} size={22} />
                  <Text style={styles.name}>{group.name}</Text>
                  <Text style={styles.count}>{group.existingCount}/4</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {!groups.some(group => group.complete) && (
            <Text style={s.muted}>暂无四个角点完整的椎体</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    rowGap: 8,
  },
  slot: { width: '25%', paddingHorizontal: 4 },
  group: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    backgroundColor: c.surface,
  },
  name: { fontSize: 12, color: c.text },
  count: { fontSize: 10, color: c.muted },
  disabled: { opacity: 0.45 },
  error: { fontSize: 12, color: c.danger, lineHeight: 18 },
});
