import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getAnnotationDisplayName,
  getColorForType,
} from '@xiehe/imaging-catalog/annotations';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import type { EditorSelection } from '../application/dragAnnotation';
import { EditorButton } from './EditorButton';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function MeasurementPanel({
  measurements,
  selection,
  disabled,
  onSelect,
  onDelete,
  onClose,
}: {
  measurements: MeasurementData[];
  selection: EditorSelection | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const selectedId =
    selection && 'measurementId' in selection ? selection.measurementId : null;
  return (
    <View style={s.panel}>
      <View style={styles.heading}>
        <View style={s.row}>
          <Text style={s.title}>测量数据</Text>
          <Text style={styles.count}>{measurements.length}</Text>
        </View>
        <View style={s.row}>
          {selectedId && (
            <EditorButton
              compact
              label="删除选中测量"
              icon="trash-outline"
              danger
              onPress={onDelete}
              disabled={disabled}
            />
          )}
          <EditorButton
            compact
            label="收起测量数据"
            icon="chevron-down"
            onPress={onClose}
          />
        </View>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.items}>
        {!measurements.length && (
          <Text style={styles.empty}>
            暂无测量 · 从工具面板选择工具开始标注
          </Text>
        )}
        {measurements.map(measurement => {
          const selected = measurement.id === selectedId;
          const color = getColorForType(measurement.type);
          return (
            <Pressable
              key={measurement.id}
              accessibilityRole="button"
              accessibilityLabel={`选择测量 ${getAnnotationDisplayName(measurement.type)}`}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(measurement.id)}
              style={[styles.item, selected && styles.selected]}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.name}>
                  {getAnnotationDisplayName(measurement.type)}
                </Text>
                {!!measurement.description && (
                  <Text numberOfLines={1} style={styles.description}>
                    {measurement.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.value, { color }]}>
                {measurement.value || '—'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  heading: {
    ...s.between,
    paddingLeft: 16,
    paddingRight: 10,
    minHeight: 50,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  count: {
    color: c.muted,
    backgroundColor: c.surface,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 11,
  },
  list: { maxHeight: 165 },
  items: { padding: 10, gap: 6 },
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#11182780',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: '#172D52', borderColor: '#3B82F6' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  name: { fontSize: 12, color: c.text, fontWeight: '600' },
  description: { color: c.muted, fontSize: 10, marginTop: 3 },
  value: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '45%',
    fontVariant: ['tabular-nums'],
  },
  empty: { color: c.muted, padding: 12, fontSize: 12, textAlign: 'center' },
});
