import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AvtTarget, MeasurementData } from '@xiehe/imaging-core/contracts';
import { getAnnotationTypeId } from '@xiehe/imaging-core/measurements';
import {
  AVT_DISC_TARGETS,
  AVT_VERTEBRA_TARGETS,
  getAvtTargetLabel,
  isSameAvtTarget,
} from '@xiehe/imaging-core/measurements/ap';
import { EditorButton } from './EditorButton';
import { editorColors as c, editorStyles as s } from './editorTheme';

const vertebraTargets: AvtTarget[] = AVT_VERTEBRA_TARGETS.map(vertebra => ({
  type: 'vertebra',
  vertebra,
}));

export function EditorAvtTargets({
  measurements,
  disabled,
  onSelect,
}: {
  measurements: MeasurementData[];
  disabled: boolean;
  onSelect: (target: AvtTarget) => void;
}) {
  const [targetType, setTargetType] = useState<AvtTarget['type'] | null>(null);
  const exists = (target: AvtTarget) =>
    measurements.some(
      measurement =>
        getAnnotationTypeId(measurement.type) === 'avt' &&
        isSameAvtTarget(measurement, target)
    );
  const targets = (type: AvtTarget['type']) =>
    type === 'vertebra' ? vertebraTargets : AVT_DISC_TARGETS;
  if (targetType === null)
    return (
      <>
        <Text style={s.muted}>选择 AVT 测量对象</Text>
        <View style={styles.types}>
          {(
            [
              ['vertebra', '椎体中心'],
              ['disc', '椎间盘'],
            ] as const
          ).map(([type, label]) => (
            <View key={type} style={styles.type}>
              <EditorButton
                label={label}
                disabled={disabled || targets(type).every(exists)}
                onPress={() => setTargetType(type)}
              />
            </View>
          ))}
        </View>
      </>
    );
  return (
    <>
      <View style={s.between}>
        <EditorButton
          label="返回"
          icon="arrow-back"
          onPress={() => setTargetType(null)}
        />
        <Text style={s.muted}>
          选择{targetType === 'vertebra' ? '椎体' : '椎间盘'}
        </Text>
      </View>
      <View style={styles.targets}>
        {targets(targetType).map(target => {
          const label = getAvtTargetLabel(target);
          const unavailable = disabled || exists(target);
          return (
            <View key={label} style={styles.slot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`创建 AVT(${label})`}
                accessibilityState={{ disabled: unavailable }}
                accessibilityHint={exists(target) ? '该 AVT 已存在' : undefined}
                disabled={unavailable}
                onPress={() => onSelect(target)}
                style={[styles.target, unavailable && styles.disabled]}
              >
                <Text style={styles.label}>{label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', gap: 8 },
  type: { flex: 1 },
  targets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    rowGap: 6,
  },
  slot: { width: '25%', paddingHorizontal: 3 },
  target: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.raised,
    borderRadius: 7,
  },
  label: { color: c.text, fontSize: 12 },
  disabled: { opacity: 0.4 },
});
