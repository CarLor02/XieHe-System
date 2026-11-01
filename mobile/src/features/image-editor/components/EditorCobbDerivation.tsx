import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getMeasurementDeriveEndpointGroups,
  isValidMeasurementDeriveEndpointOrder,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import { Icon } from '@/shared/ui';
import { EditorButton } from './EditorButton';
import { EditorSelectField } from './EditorSelectField';
import { ToolIcon } from './ToolIcon';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function EditorCobbDerivation({
  session,
  error,
  onApplied,
}: {
  session: ImageEditorSession;
  error: string;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const keypoints = session.snapshot?.keypoints ?? [];
  const upperOptions = getMeasurementDeriveEndpointGroups(
    keypoints,
    session.context.examType,
    'upper'
  );
  const lowerOptions = getMeasurementDeriveEndpointGroups(
    keypoints,
    session.context.examType,
    'lower'
  );
  const [upper, setUpper] = useState(upperOptions[0] ?? '');
  const [lower, setLower] = useState(
    lowerOptions.find(value =>
      isValidMeasurementDeriveEndpointOrder(upper, value)
    ) ?? ''
  );
  const available = upperOptions.some(up =>
    lowerOptions.some(low => isValidMeasurementDeriveEndpointOrder(up, low))
  );
  const disabled = !session.editable;
  return (
    <View style={styles.section}>
      <View style={s.row}>
        <Icon name="resize-outline" color={c.muted} size={16} />
        <Text style={s.muted}>测量标注</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.slot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="派生 Cobb"
            accessibilityState={{
              disabled: disabled || !available,
              selected: open,
            }}
            accessibilityHint={
              !available ? '暂无满足 Cobb 端板要求的关键点' : undefined
            }
            disabled={disabled || !available}
            onPress={() => setOpen(current => !current)}
            style={[
              styles.tool,
              open && styles.selected,
              (disabled || !available) && styles.disabled,
            ]}
          >
            <ToolIcon
              toolId="cobb"
              iconId="medical-cobb"
              color={c.text}
              size={24}
            />
            <Text style={styles.name}>Cobb</Text>
            <View
              style={[styles.badge, available && !disabled && styles.available]}
            >
              <Icon
                name={available && !disabled ? 'checkmark' : 'remove'}
                size={10}
                color={c.text}
              />
            </View>
          </Pressable>
        </View>
      </View>
      {!available && (
        <Text style={s.muted}>暂无满足 Cobb 端板要求的关键点</Text>
      )}
      {open && (
        <View style={styles.form}>
          <Text style={s.title}>派生Cobb</Text>
          <EditorSelectField
            label="上端椎"
            value={upper || null}
            options={upperOptions.map(value => ({
              value,
              label: value,
              disabled: value === lower,
            }))}
            disabled={disabled}
            onChange={value => {
              setUpper(value);
              if (!isValidMeasurementDeriveEndpointOrder(value, lower))
                setLower(
                  lowerOptions.find(item =>
                    isValidMeasurementDeriveEndpointOrder(value, item)
                  ) ?? ''
                );
            }}
          />
          <EditorSelectField
            label="下端椎"
            value={lower || null}
            options={lowerOptions.map(value => ({
              value,
              label: value,
              disabled: value === upper,
            }))}
            disabled={disabled}
            onChange={setLower}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <EditorButton
            label="应用派生"
            primary
            disabled={disabled || !upper || !lower || upper === lower}
            onPress={() => {
              if (session.deriveCobb(upper, lower)) onApplied();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  form: { gap: 12, padding: 12, borderRadius: 10, backgroundColor: c.surface },
  grid: { flexDirection: 'row', marginHorizontal: -4 },
  slot: { width: '25%', paddingHorizontal: 4 },
  tool: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    backgroundColor: c.raised,
  },
  name: { color: c.text, fontSize: 12 },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.raised,
  },
  available: { backgroundColor: '#10B981' },
  selected: { backgroundColor: c.blue },
  disabled: { opacity: 0.45 },
  error: { color: c.danger, fontSize: 12, lineHeight: 18 },
});
