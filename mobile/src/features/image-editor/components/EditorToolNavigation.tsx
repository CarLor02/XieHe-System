import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BASIC_MODE_LABELS,
  getToolTabCopy,
} from '@xiehe/imaging-catalog/tools';
import {
  getToolTabsForBasicMode,
  type BasicMode,
  type ToolTab,
} from '@xiehe/imaging-core/editor';
import { Icon } from '@/shared/ui';
import { editorColors as c } from './editorTheme';

export function EditorToolNavigation({
  tab,
  editable,
  canUseKeypoints,
  modes,
  mode,
  onModeChange,
  onTabChange,
}: {
  tab: ToolTab;
  editable: boolean;
  canUseKeypoints: boolean;
  modes: readonly BasicMode[];
  mode: BasicMode;
  onModeChange: (mode: BasicMode) => void;
  onTabChange: (tab: ToolTab) => void;
}) {
  return (
    <>
      <View style={styles.modes}>
        <Text style={styles.heading}>基础模式</Text>
        <View style={styles.modeRow}>
          {modes.map(item => {
            const selected = item === mode;
            const disabled = !editable;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={BASIC_MODE_LABELS[item]}
                accessibilityState={{ selected, disabled }}
                aria-pressed={selected}
                disabled={disabled}
                onPress={() => onModeChange(item)}
                style={[
                  styles.mode,
                  selected && styles.activeMode,
                  disabled && styles.disabled,
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.label}
                >
                  {BASIC_MODE_LABELS[item]}
                </Text>
                {selected && (
                  <View style={styles.selectedBadge}>
                    <Icon name="checkmark" color={c.text} size={12} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {getToolTabsForBasicMode(mode).map(id => {
          const selected = tab === id;
          const disabled = id === 'keypoint' && !canUseKeypoints;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={getToolTabCopy(id).label}
              accessibilityState={{ selected, disabled }}
              aria-selected={selected}
              disabled={disabled}
              onPress={() => onTabChange(id)}
              style={[
                styles.tab,
                selected && styles.activeTab,
                disabled && styles.disabled,
              ]}
            >
              <Icon
                name={
                  id === 'measurement'
                    ? 'resize-outline'
                    : id === 'vertebra-label-offset'
                      ? 'swap-vertical-outline'
                      : 'locate-outline'
                }
                color={selected ? c.text : c.muted}
                size={16}
              />
              <Text style={[styles.label, !selected && { color: c.muted }]}>
                {getToolTabCopy(id).label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  modes: { gap: 9 },
  heading: { color: c.muted, fontSize: 13, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.raised,
  },
  activeMode: { backgroundColor: c.blue, borderColor: c.blueLight },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.blue,
  },
  label: { color: c.text, fontSize: 12, fontWeight: '500' },
  disabled: { opacity: 0.45 },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    backgroundColor: c.surface,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 7,
  },
  activeTab: { backgroundColor: c.blue },
});
