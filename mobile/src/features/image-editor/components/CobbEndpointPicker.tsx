import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { getAnnotationDisplayName } from '@xiehe/imaging-catalog/annotations';
import type { CobbEndpointField } from '@/features/image-editor/application/cobbEndpointRules';
import { EditorButton } from './EditorButton';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function CobbEndpointPicker({
  measurement,
  field,
  options,
  disabled,
  error,
  onChange,
  onClose,
}: {
  measurement: MeasurementData;
  field: CobbEndpointField;
  options: string[];
  disabled: boolean;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const label = field === 'upperVertebra' ? '上端椎' : '下端椎';
  const opposite = measurement[
    field === 'upperVertebra' ? 'lowerVertebra' : 'upperVertebra'
  ]
    ?.trim()
    .toUpperCase();
  const current = measurement[field]?.trim().toUpperCase();
  return (
    <View style={styles.panel}>
      <View style={s.between}>
        <Text style={s.title}>
          {getAnnotationDisplayName(measurement.type)} · 选择{label}
        </Text>
        <EditorButton
          compact
          label="关闭端椎选择"
          icon="close"
          onPress={onClose}
        />
      </View>
      <ScrollView
        nestedScrollEnabled
        style={styles.scroll}
        contentContainerStyle={styles.options}
        keyboardShouldPersistTaps="handled"
      >
        {options.map(option => {
          const blocked = disabled || option === opposite;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`${label}选项 ${option}`}
              accessibilityState={{
                disabled: blocked,
                selected: option === current,
              }}
              disabled={blocked}
              onPress={() => onChange(option)}
              style={[
                styles.option,
                current === option && styles.selected,
                blocked && styles.disabled,
              ]}
            >
              <Text style={styles.label}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
    padding: 10,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: c.surface,
  },
  scroll: { maxHeight: 180 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    minWidth: 46,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.raised,
    borderRadius: 7,
  },
  label: { color: c.text, fontSize: 12 },
  selected: { backgroundColor: c.blue },
  disabled: { opacity: 0.4 },
  error: { color: c.danger, fontSize: 12, lineHeight: 18 },
});
