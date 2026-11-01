import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useSyncExternalStore } from 'react';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { CobbEndpointField } from '@/features/image-editor/application/cobbEndpointRules';
import { getVertebraOptions } from '@/features/image-editor/application/editorToolQueries';
import { EditorButton } from './EditorButton';
import { MeasurementRow } from './MeasurementRow';
import { CobbEndpointPicker } from './CobbEndpointPicker';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function MeasurementPanel({
  readouts,
  disabled,
  onSelect,
  onDelete,
  onClose,
  onUpdateCobbEndpoint,
}: {
  readouts: EditorReadoutStore;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onUpdateCobbEndpoint: (
    id: string,
    field: CobbEndpointField,
    vertebra: string
  ) => boolean;
}) {
  const [editing, setEditing] = useState<{
    measurementId: string;
    field: CobbEndpointField;
  } | null>(null);
  const [endpointError, setEndpointError] = useState('');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const state = useSyncExternalStore(
    readouts.subscribe,
    readouts.getState,
    readouts.getState
  );
  const measurements = state.history?.present.measurements ?? [];
  const endpointOptions = getVertebraOptions(state.image?.description ?? '');
  const selection = state.selection;
  const interactionDisabled = disabled || state.dragging;
  const selectedId =
    selection && 'measurementId' in selection ? selection.measurementId : null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭测量数据遮罩"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.65,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View style={s.row}>
              <Text accessibilityRole="header" style={s.title}>
                测量数据
              </Text>
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
                  disabled={interactionDisabled}
                />
              )}
              <EditorButton
                compact
                label="关闭测量数据"
                icon="close"
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
            {measurements.map(measurement => (
              <View key={measurement.id}>
                <MeasurementRow
                  measurement={measurement}
                  selected={measurement.id === selectedId}
                  disabled={interactionDisabled}
                  onSelect={onSelect}
                  canEditEndpoints={endpointOptions.length > 0}
                  onEditEndpoint={(id, field) => {
                    onSelect(id);
                    setEndpointError('');
                    setEditing({ measurementId: id, field });
                  }}
                />
                {editing?.measurementId === measurement.id && (
                  <CobbEndpointPicker
                    measurement={measurement}
                    field={editing.field}
                    options={endpointOptions}
                    disabled={interactionDisabled}
                    error={endpointError}
                    onClose={() => setEditing(null)}
                    onChange={value => {
                      if (
                        onUpdateCobbEndpoint(
                          measurement.id,
                          editing.field,
                          value
                        )
                      )
                        setEditing(null);
                      else
                        setEndpointError(
                          readouts.getState().error || '当前暂时无法修改端椎'
                        );
                    }}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  sheet: {
    backgroundColor: c.panel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: c.raised,
    width: 36,
    height: 4,
    borderRadius: 4,
    marginTop: 9,
  },
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
  list: { flexGrow: 0, flexShrink: 1 },
  items: { padding: 10, gap: 6 },
  empty: { color: c.muted, padding: 12, fontSize: 12, textAlign: 'center' },
});
