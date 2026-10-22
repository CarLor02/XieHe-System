import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import { getColorForType } from '@xiehe/imaging-catalog/annotations';
import type { AvtTarget, FemoralHeadMode } from '@xiehe/imaging-core/contracts';
import {
  AVT_DISC_TARGETS,
  AVT_VERTEBRA_TARGETS,
  getAvtTargetLabel,
} from '@xiehe/imaging-core/measurements/ap';
import { getKeypointGroupsForExamType } from '@xiehe/imaging-core/keypoints';
import { getMeasurementDeriveVertebraOrder } from '@xiehe/imaging-core/anatomy';
import {
  isAuxiliaryToolbarTool,
  getAnnotationTypeId,
} from '@xiehe/imaging-core/measurements';
import { Icon } from '../../../shared/ui';
import type {
  ImageEditorSession,
  EditorState,
} from '../application/ImageEditorSession';
import { EditorButton } from './EditorButton';
import { ToolIcon } from './ToolIcon';
import { editorColors as c, editorStyles as s } from './editorTheme';

export function EditorToolSheet({
  session,
  state,
  open,
  onClose,
  onReload,
  onOpenPerformance,
}: {
  session: ImageEditorSession;
  state: EditorState;
  open: boolean;
  onClose: () => void;
  onReload: () => void;
  onOpenPerformance: () => void;
}) {
  const [configured, setConfigured] = useState('');
  const [distance, setDistance] = useState(
    String(session.snapshot?.standardDistance ?? 100)
  );
  const [mode, setMode] = useState<FemoralHeadMode>('single');
  const [target, setTarget] = useState<AvtTarget>({
    type: 'vertebra',
    vertebra: 'T12',
  });
  const [upper, setUpper] = useState<string | null>(null);
  const [lower, setLower] = useState<string | null>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tools = getToolsForExamType(session.context.examType);
  const vertebrae = getKeypointGroupsForExamType(session.context.examType)
    .map(group => group.name)
    .filter(name => getMeasurementDeriveVertebraOrder(name) !== null)
    .sort(
      (left, right) =>
        getMeasurementDeriveVertebraOrder(left)! -
        getMeasurementDeriveVertebraOrder(right)!
    );
  const activate = (tool: string) => {
    if (['avt', 'pi', 'pt', 'tpa', 'lateral-cobb'].includes(tool)) {
      setConfigured(tool);
      setMode(
        session.snapshot?.keypoints.some(
          k => k.id === 'FH-1' || k.id === 'FH-2'
        )
          ? 'bilateral'
          : 'single'
      );
    } else {
      session.chooseTool(tool);
      onClose();
    }
  };
  const renderGroup = (auxiliary: boolean) => (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        {auxiliary ? '辅助图形' : '测量工具'}
      </Text>
      <View style={styles.grid}>
        {tools
          .filter(tool => isAuxiliaryToolbarTool(tool.id) === auxiliary)
          .map(tool => {
            const count =
              session.snapshot?.measurements.filter(
                m => getAnnotationTypeId(m.type) === tool.id
              ).length ?? 0;
            const selected = state.tool === tool.id || configured === tool.id;
            const label = [
              'circle',
              'ellipse',
              'rectangle',
              'arrow',
              'polygon',
            ].includes(tool.id)
              ? tool.description
              : tool.name;
            return (
              <Pressable
                key={tool.id}
                disabled={!session.editable}
                accessibilityRole="button"
                accessibilityLabel={`绘制${label}`}
                accessibilityState={{ selected, disabled: !session.editable }}
                onPress={() => activate(tool.id)}
                onLongPress={() => setConfigured(tool.id)}
                style={[styles.tool, selected && styles.activeTool]}
              >
                <ToolIcon
                  toolId={tool.id}
                  iconId={tool.icon}
                  color={selected ? '#FFF' : getColorForType(tool.id)}
                />
                <Text style={styles.toolName} numberOfLines={2}>
                  {label}
                </Text>
                <Text style={styles.pointCount}>
                  {['avt', 'pi', 'pt', 'tpa'].includes(tool.id)
                    ? '分步放置'
                    : tool.pointsNeeded
                      ? `${tool.pointsNeeded} 点`
                      : '自由绘制'}
                </Text>
                {!!count && <Text style={styles.badge}>{count}</Text>}
              </Pressable>
            );
          })}
      </View>
    </View>
  );
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <Pressable
          accessibilityLabel="关闭工具面板"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.82,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View>
              <Text style={styles.headingText}>标注工具</Text>
              <Text style={s.muted}>
                {session.context.examType} · 与 Web 使用相同点位规则
              </Text>
            </View>
            <EditorButton
              compact
              label="关闭标注工具"
              icon="close"
              onPress={onClose}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={s.row}>
              <EditorButton
                label="移动 / 编辑"
                icon="hand-left-outline"
                active={state.tool === 'hand'}
                onPress={() => {
                  session.chooseTool('hand');
                  onClose();
                }}
              />
              {!!session.snapshot?.keypoints.length && (
                <EditorButton
                  label="关键点"
                  icon="locate-outline"
                  active={state.tool === 'keypoint'}
                  onPress={() => {
                    session.chooseTool('keypoint');
                    onClose();
                  }}
                />
              )}
            </View>
            {!configured && renderGroup(false)}
            {!configured && renderGroup(true)}
            {!!configured && (
              <View style={styles.configuration}>
                <EditorButton
                  label="返回工具列表"
                  icon="arrow-back"
                  onPress={() => setConfigured('')}
                />
                <Text style={s.title}>
                  {tools.find(t => t.id === configured)?.name} · 绘图设置
                </Text>
                <Text style={s.muted}>
                  {tools.find(t => t.id === configured)?.description}
                </Text>
                {['pi', 'pt', 'tpa'].includes(configured) && (
                  <View style={s.row}>
                    <EditorButton
                      label="单股骨头"
                      active={mode === 'single'}
                      onPress={() => setMode('single')}
                    />
                    <EditorButton
                      label="双股骨头"
                      active={mode === 'bilateral'}
                      onPress={() => setMode('bilateral')}
                    />
                  </View>
                )}
                {configured === 'avt' && (
                  <>
                    <Text style={s.muted}>
                      选择顶椎或椎间盘，参考线由共享规则确定
                    </Text>
                    <View style={styles.chips}>
                      {[
                        ...AVT_VERTEBRA_TARGETS.map(vertebra => ({
                          type: 'vertebra' as const,
                          vertebra,
                        })),
                        ...AVT_DISC_TARGETS,
                      ].map(item => (
                        <Pressable
                          key={getAvtTargetLabel(item)}
                          onPress={() => setTarget(item)}
                          style={[
                            styles.chip,
                            getAvtTargetLabel(item) ===
                              getAvtTargetLabel(target) && styles.activeTool,
                          ]}
                        >
                          <Text style={styles.chipText}>
                            {getAvtTargetLabel(item)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
                {configured === 'lateral-cobb' && (
                  <>
                    <Text style={s.muted}>
                      端椎可待定；选定后会复用已有终板点位
                    </Text>
                    {(['upper', 'lower'] as const).map(role => (
                      <View key={role} style={{ gap: 6 }}>
                        <Text style={s.muted}>
                          {role === 'upper' ? '上端椎' : '下端椎'}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={s.row}>
                            {[null, ...vertebrae].map(item => (
                              <Pressable
                                key={item ?? 'none'}
                                onPress={() =>
                                  role === 'upper'
                                    ? setUpper(item)
                                    : setLower(item)
                                }
                                style={[
                                  styles.chip,
                                  (role === 'upper' ? upper : lower) === item &&
                                    styles.activeTool,
                                ]}
                              >
                                <Text style={styles.chipText}>
                                  {item ?? '待定'}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    ))}
                  </>
                )}
                <EditorButton
                  primary
                  label="开始标注"
                  icon="create-outline"
                  disabled={
                    !session.editable ||
                    (configured === 'lateral-cobb' &&
                      !!upper &&
                      upper === lower)
                  }
                  onPress={() => {
                    session.chooseTool(configured, {
                      ...(['pi', 'pt', 'tpa'].includes(configured)
                        ? { pelvicMode: mode }
                        : {}),
                      ...(configured === 'avt' ? { avtTarget: target } : {}),
                      ...(configured === 'lateral-cobb'
                        ? {
                            cobbEndpoints: {
                              upperVertebra: upper,
                              lowerVertebra: lower,
                            },
                          }
                        : {}),
                    });
                    setConfigured('');
                    onClose();
                  }}
                />
              </View>
            )}
            <View style={styles.configuration}>
              <View style={s.row}>
                <Icon name="resize-outline" color="#FBBF24" size={18} />
                <Text style={s.title}>标准距离</Text>
              </View>
              <Text style={s.muted}>
                在图中放置标尺的两个端点，再填写对应的实际长度。
              </Text>
              <View style={s.row}>
                <TextInput
                  accessibilityLabel="标准距离毫米"
                  keyboardType="decimal-pad"
                  value={distance}
                  onChangeText={setDistance}
                  style={[s.field, { flex: 1 }]}
                />
                <Text style={s.muted}>mm</Text>
                <EditorButton
                  label="应用"
                  disabled={!session.editable}
                  onPress={() => session.setStandardDistance(distance)}
                />
              </View>
              <EditorButton
                label="在影像上放置标尺"
                icon="resize-outline"
                disabled={!session.editable}
                onPress={() => {
                  session.chooseTool('calibration');
                  onClose();
                }}
              />
              <Text style={s.muted}>
                当前：{session.snapshot?.standardDistance ?? '未设置'} mm
              </Text>
            </View>
            {!!state.error && (
              <Text style={{ color: c.danger, fontSize: 12 }}>
                {state.error}
              </Text>
            )}
            <EditorButton
              label="重新读取服务器标注"
              icon="cloud-download-outline"
              disabled={state.saving}
              onPress={() => {
                onClose();
                onReload();
              }}
            />
            <EditorButton
              label="画布性能统计"
              icon="speedometer-outline"
              onPress={onOpenPerformance}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
    backgroundColor: '#4B5563',
    width: 36,
    height: 4,
    borderRadius: 4,
    marginTop: 9,
  },
  heading: {
    ...s.between,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  headingText: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  content: { padding: 16, gap: 20 },
  group: { gap: 10 },
  groupTitle: { color: c.muted, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: {
    width: '23%',
    flexGrow: 1,
    maxWidth: '25%',
    minHeight: 91,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
  },
  activeTool: { backgroundColor: c.blue, borderColor: '#60A5FA' },
  toolName: { fontSize: 11, textAlign: 'center', color: c.text },
  pointCount: { color: c.muted, fontSize: 9 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 5,
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '700',
  },
  configuration: {
    backgroundColor: c.surface,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 40,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 9,
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 7,
  },
  chipText: { color: c.text, fontSize: 12 },
});
