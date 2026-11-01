import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { isCobbMeasurement } from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  getAnnotationDisplayName,
  getColorForType,
} from '@xiehe/imaging-catalog/annotations';
import type { CobbEndpointField } from '@/features/image-editor/application/cobbEndpointRules';
import { editorColors as c } from './editorTheme';

export const MeasurementRow = memo(function MeasurementRow({
  measurement,
  selected,
  disabled,
  canEditEndpoints,
  onSelect,
  onEditEndpoint,
}: {
  measurement: MeasurementData;
  selected: boolean;
  disabled: boolean;
  canEditEndpoints: boolean;
  onSelect: (id: string) => void;
  onEditEndpoint: (id: string, field: CobbEndpointField) => void;
}) {
  const name = getAnnotationDisplayName(measurement.type);
  const color = getColorForType(measurement.type);
  const select = () => onSelect(measurement.id);
  const value = (
    <Text style={[styles.value, { color }]}>{measurement.value || '—'}</Text>
  );
  if (!isCobbMeasurement(measurement))
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`选择测量 ${name}`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={select}
        style={[styles.item, selected && styles.selected]}
      >
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={[styles.name, styles.grow]}>
          {name}
        </Text>
        <View style={{ maxWidth: '45%' }}>{value}</View>
      </Pressable>
    );
  const endpoint = (field: CobbEndpointField) => {
    const label = field === 'upperVertebra' ? '上端椎' : '下端椎';
    const current = measurement[field]?.trim() || `${label}待定`;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`修改 ${name} ${label}：${current}`}
        accessibilityState={{ disabled: disabled || !canEditEndpoints }}
        disabled={disabled || !canEditEndpoints}
        onPress={() => onEditEndpoint(measurement.id, field)}
        style={styles.endpoint}
      >
        <Text
          style={[
            styles.endpointText,
            (disabled || !canEditEndpoints) && styles.disabled,
          ]}
        >
          {current}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.item, selected && styles.selected]}>
      <View style={styles.labels}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`选择测量 ${name}`}
          accessibilityState={{ selected, disabled }}
          disabled={disabled}
          onPress={select}
          style={styles.selectName}
        >
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.name}>{name}</Text>
        </Pressable>
        <View style={styles.endpoints}>
          <Text style={styles.name}>(</Text>
          {endpoint('upperVertebra')}
          <Text style={styles.name}>－</Text>
          {endpoint('lowerVertebra')}
          <Text style={styles.name}>)</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`选择测量 ${name} 数值`}
        disabled={disabled}
        onPress={select}
        style={styles.selectValue}
      >
        {value}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  item: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#11182780',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: '#172D52', borderColor: '#3B82F6' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  name: { fontSize: 12, color: c.text, fontWeight: '600' },
  grow: { flex: 1, minWidth: 0 },
  labels: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  selectName: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
    paddingRight: 4,
  },
  endpoints: { flexDirection: 'row', alignItems: 'center' },
  endpoint: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endpointText: {
    color: c.blueLight,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  disabled: { opacity: 0.45 },
  selectValue: { minHeight: 44, justifyContent: 'center', maxWidth: '38%' },
  value: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
