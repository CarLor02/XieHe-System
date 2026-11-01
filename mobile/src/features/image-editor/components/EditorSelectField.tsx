import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/shared/ui';
import { editorColors as c, editorStyles as s } from './editorTheme';

/** 在工具浮层内展开选项，避免叠加第二个原生 Modal。 */
export function EditorSelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T | null;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = options.find(option => option.value === value);
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}：${selected?.label ?? '请选择'}`}
        accessibilityState={{ expanded, disabled }}
        aria-expanded={expanded}
        disabled={disabled}
        onPress={() => setExpanded(current => !current)}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={s.muted}>{label}</Text>
        <View style={s.row}>
          <Text style={styles.value}>{selected?.label ?? '请选择'}</Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={c.muted}
          />
        </View>
      </Pressable>
      {expanded && (
        <ScrollView
          nestedScrollEnabled
          style={styles.options}
          contentContainerStyle={styles.grid}
          keyboardShouldPersistTaps="handled"
        >
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${label}选项 ${option.label}`}
              accessibilityState={{
                selected: value === option.value,
                disabled: disabled || option.disabled,
              }}
              disabled={disabled || option.disabled}
              onPress={() => {
                onChange(option.value);
                setExpanded(false);
              }}
              style={[
                styles.option,
                value === option.value && styles.selected,
                (disabled || option.disabled) && styles.disabled,
              ]}
            >
              <Text style={styles.value}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  trigger: {
    ...s.between,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
  },
  value: { color: c.text, fontSize: 12 },
  options: { maxHeight: 180, backgroundColor: c.surface, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  option: {
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.raised,
    borderRadius: 7,
  },
  selected: { backgroundColor: c.blue },
  disabled: { opacity: 0.4 },
});
