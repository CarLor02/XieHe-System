import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import { getKeypointToolGroups } from '@/features/image-editor/application/keypointTools';
import { Icon } from '@/shared/ui';
import { EditorButton } from './EditorButton';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function EditorKeypointTools({
  session,
  onClose,
}: {
  session: ImageEditorSession;
  onClose: () => void;
}) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const groups = getKeypointToolGroups(
    session.context.examType,
    session.snapshot?.keypoints ?? []
  );
  const selected = groups.find(group => group.id === groupId);
  const start = (tool: string) => {
    session.chooseTool(tool);
    onClose();
  };
  if (selected)
    return (
      <View style={styles.section}>
        <EditorButton
          label="返回关键点组"
          icon="arrow-back"
          onPress={() => setGroupId(null)}
        />
        <Text style={s.title}>选择 {selected.name}</Text>
        <View style={styles.grid}>
          {selected.keypoints.map(point => {
            const exists = !selected.missing.some(item => item.id === point.id);
            const disabled =
              !session.editable || !!selected.blockedReason || exists;
            return (
              <Pressable
                key={point.id}
                accessibilityRole="button"
                accessibilityLabel={`绘制关键点 ${point.name}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => start(`keypoint:${point.id}`)}
                style={[styles.point, disabled && styles.disabled]}
              >
                <Text style={styles.label}>{point.name}</Text>
                {exists && <Text style={styles.count}>已存在</Text>}
              </Pressable>
            );
          })}
        </View>
        {selected.canSequence && (
          <EditorButton
            label="连续标注缺失点"
            primary
            disabled={!session.editable || !!selected.blockedReason}
            onPress={() => start(`keypoint-group:${selected.id}`)}
          />
        )}
      </View>
    );
  return (
    <View style={styles.section}>
      <Text style={s.title}>关键点组</Text>
      <View style={styles.grid}>
        {groups.map(group => {
          const disabled = !session.editable || !!group.blockedReason;
          return (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={`关键点组 ${group.name}`}
              accessibilityHint={group.blockedReason || undefined}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => setGroupId(group.id)}
              style={[styles.group, disabled && styles.disabled]}
            >
              <Icon name="locate-outline" color={c.blueLight} size={22} />
              <Text style={styles.label}>{group.name}</Text>
              <Text style={styles.count}>
                {group.existingCount}/{group.keypoints.length}
              </Text>
              {!!group.blockedReason && (
                <Text style={styles.count}>{group.blockedReason}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: {
    width: '23%',
    minHeight: 78,
    padding: 6,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  point: {
    minWidth: 64,
    minHeight: 44,
    padding: 8,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  label: { fontSize: 12, color: c.text },
  count: { fontSize: 10, color: c.muted, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
