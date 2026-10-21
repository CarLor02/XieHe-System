import { useEffect, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getExamKind } from '@xiehe/imaging-core/measurements';
import { Icon } from '../../../shared/ui';
import type { ImageEditorGateway } from '../application/ports';
import { useImageEditor } from '../application/useImageEditor';
import { EditorCanvas } from './EditorCanvas';
import { EditorButton } from './EditorButton';
import { EditorConfirmDialog } from './EditorConfirmDialog';
import { EditorToolSheet } from './EditorToolSheet';
import { MeasurementPanel } from './MeasurementPanel';
import { editorColors as c, editorStyles as s } from './editorTheme';

type Confirmation = 'clear' | 'delete' | 'reload' | 'leave' | null;

export function ImageEditorScreen({
  imageId,
  gateway,
}: {
  imageId: number;
  gateway: ImageEditorGateway;
}) {
  const { session, state } = useImageEditor(imageId, gateway);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [allowLeave, setAllowLeave] = useState(false);
  const hasDraft = state.dirty || !!state.drawing || state.dragging;
  usePreventRemove(!allowLeave && (hasDraft || state.saving), ({ data }) => {
    if (state.saving) return;
    setPendingLeave(() => () => navigation.dispatch(data.action));
    setConfirmation('leave');
  });
  useEffect(() => {
    if (allowLeave && pendingLeave) pendingLeave();
  }, [allowLeave, pendingLeave]);
  const goBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/images/[id]', params: { id: imageId } });
  const leave = () => {
    if (state.saving) return;
    if (hasDraft) {
      setPendingLeave(() => goBack);
      setConfirmation('leave');
    } else goBack();
  };
  const save = async (complete: boolean) => {
    if (await session.save()) {
      if (complete) {
        setPendingLeave(() => goBack);
        setAllowLeave(true);
      }
    }
  };
  const reload = () => {
    if (hasDraft) setConfirmation('reload');
    else {
      setResetToken(t => t + 1);
      void session.load();
    }
  };
  const confirm = () => {
    if (confirmation === 'clear') session.clear();
    if (confirmation === 'delete') session.deleteSelected();
    if (confirmation === 'reload') {
      setResetToken(t => t + 1);
      void session.load();
    }
    if (confirmation === 'leave') setAllowLeave(true);
    setConfirmation(null);
  };
  const kind = getExamKind(session.context.examType);
  const examLabel = {
    ap: '正位',
    lateral: '侧位',
    bending: '曲位',
    generic: '通用',
  }[kind];
  const blocked = !session.editable || !!state.drawing || state.dragging;
  const confirmations = {
    clear: {
      title: '清除全部标注？',
      description:
        '将清除当前草稿中的测量、关键点和绑定，保留标尺与报告。保存后才会更新服务器，也可以通过撤销恢复。',
      confirmLabel: '清除标注',
      danger: true,
    },
    delete: {
      title: '删除选中的测量？',
      description:
        '按 Web 相同规则处理关联测量和独占关键点；删除后可撤销，保存后才写入服务器。',
      confirmLabel: '删除测量',
      danger: true,
    },
    reload: {
      title: '重新读取服务器标注？',
      description: '当前未保存的修改将被丢弃，读取服务器最新影像、点位和版本。',
      confirmLabel: '重新读取',
      danger: true,
    },
    leave: {
      title: '放弃未保存的修改？',
      description:
        '本次点位修改还没有保存到服务器。可以取消返回编辑，或放弃修改离开。',
      confirmLabel: '放弃并离开',
      danger: true,
    },
  };
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <EditorButton
            compact
            icon="arrow-back"
            label="返回影像详情"
            onPress={leave}
            disabled={state.saving}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>影像标注</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {state.image?.patient_name ||
                state.image?.patient_identifier ||
                `影像 ${imageId}`}
            </Text>
          </View>
          <EditorButton
            label={state.saving ? '保存中' : '保存'}
            onPress={() => void save(false)}
            disabled={blocked}
          />
          <EditorButton
            label="完成"
            primary
            onPress={() => void save(true)}
            disabled={blocked}
          />
        </View>
        <View style={s.between}>
          <View style={s.row}>
            <View style={styles.examBadge}>
              <Icon name="scan-outline" color={c.blueLight} size={12} />
              <Text style={styles.examText}>{examLabel}</Text>
            </View>
            <Text style={styles.filename} numberOfLines={1}>
              {state.image?.original_filename || '正在读取影像'}
            </Text>
          </View>
          <View style={s.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: state.dirty ? '#FBBF24' : '#34D399' },
              ]}
            />
            <Text style={styles.version}>
              {state.dirty ? '未保存' : `版本 ${state.annotationVersion}`}
            </Text>
          </View>
        </View>
      </View>
      {state.status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.blueLight} />
          <Text style={s.muted}>正在读取影像和标注…</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" color={c.danger} size={34} />
          <Text style={styles.error}>{state.error}</Text>
          <EditorButton
            label="重新读取"
            icon="reload"
            onPress={() => void session.load()}
          />
        </View>
      ) : (
        <>
          <EditorCanvas
            key={`${imageId}-${state.preview?.uri}-${resetToken}`}
            session={session}
            state={state}
            showLabels={showLabels}
            showKeypoints={showKeypoints}
            controls={
              <>
                <EditorButton
                  compact
                  label={showLabels ? '隐藏参数标签' : '显示参数标签'}
                  icon={showLabels ? 'eye-outline' : 'eye-off-outline'}
                  active={showLabels}
                  onPress={() => setShowLabels(v => !v)}
                />
                <EditorButton
                  compact
                  label="测量数据面板"
                  icon="list-outline"
                  active={measurementsOpen && !fullscreen}
                  onPress={() => {
                    setMeasurementsOpen(v => !v);
                    setFullscreen(false);
                  }}
                />
                <EditorButton
                  compact
                  label="打开标注工具"
                  icon="construct-outline"
                  onPress={() => setToolsOpen(true)}
                  disabled={!session.editable}
                />
                {!!session.snapshot?.keypoints.length && (
                  <EditorButton
                    compact
                    label={showKeypoints ? '隐藏关键点' : '显示关键点'}
                    icon="locate-outline"
                    active={showKeypoints || state.tool === 'keypoint'}
                    onPress={() => setShowKeypoints(v => !v)}
                  />
                )}
                <EditorButton
                  compact
                  label={fullscreen ? '退出全屏' : '全屏查看'}
                  icon={fullscreen ? 'contract-outline' : 'expand-outline'}
                  active={fullscreen}
                  onPress={() => setFullscreen(v => !v)}
                />
                <EditorButton
                  compact
                  label="重置视图"
                  icon="refresh-outline"
                  onPress={() => setResetToken(t => t + 1)}
                />
              </>
            }
          />
          {!!state.error && (
            <View style={styles.banner}>
              <Icon name="alert-circle-outline" color={c.danger} size={18} />
              <Text style={styles.bannerText}>{state.error}</Text>
              <EditorButton
                compact
                label="重新读取影像"
                icon="reload"
                onPress={reload}
                disabled={state.saving}
              />
            </View>
          )}
          {!!state.message && !state.error && (
            <View style={styles.message}>
              <Icon
                name="checkmark-circle-outline"
                color={c.success}
                size={15}
              />
              <Text style={styles.messageText}>{state.message}</Text>
            </View>
          )}
          {!fullscreen && (
            <View style={styles.hint}>
              <Text numberOfLines={2} style={styles.hintText}>
                {session.hint}
              </Text>
              {state.drawing && (
                <View style={s.row}>
                  {state.tool === 'polygon' &&
                    state.drawing.points.length >= 3 && (
                      <EditorButton
                        label="完成多边形"
                        onPress={() => session.finishDrawing()}
                      />
                    )}
                  <EditorButton
                    label="取消绘图"
                    onPress={() => session.cancelDrawing()}
                  />
                </View>
              )}
            </View>
          )}
          {!fullscreen && measurementsOpen && (
            <MeasurementPanel
              measurements={session.snapshot?.measurements ?? []}
              selection={state.selection}
              disabled={state.saving || !session.editable}
              onSelect={id => {
                session.cancelDrawing();
                session.select({ kind: 'whole', measurementId: id });
              }}
              onDelete={() => setConfirmation('delete')}
              onClose={() => setMeasurementsOpen(false)}
            />
          )}
          {!fullscreen && (
            <View style={styles.footer}>
              <View style={s.row}>
                <EditorButton
                  compact
                  label="移动与编辑"
                  icon="hand-left-outline"
                  active={state.tool === 'hand'}
                  disabled={!session.editable}
                  onPress={() => session.chooseTool('hand')}
                />
                <EditorButton
                  label="工具"
                  icon="construct-outline"
                  active={!!state.drawing}
                  disabled={!session.editable}
                  onPress={() => setToolsOpen(true)}
                />
              </View>
              <View style={s.row}>
                <EditorButton
                  compact
                  label="撤销"
                  icon="arrow-undo-outline"
                  disabled={
                    !session.editable ||
                    (!state.history?.past.length && !state.drawing)
                  }
                  onPress={() =>
                    state.drawing ? session.cancelDrawing() : session.undo()
                  }
                />
                <EditorButton
                  compact
                  label="重做"
                  icon="arrow-redo-outline"
                  disabled={blocked || !state.history?.future.length}
                  onPress={() => session.redo()}
                />
                <EditorButton
                  compact
                  label="清除全部标注"
                  icon="trash-outline"
                  danger
                  disabled={
                    !session.editable ||
                    (!session.snapshot?.measurements.length &&
                      !session.snapshot?.keypoints.length)
                  }
                  onPress={() => setConfirmation('clear')}
                />
              </View>
            </View>
          )}
          <EditorToolSheet
            key={`${imageId}-${state.annotationVersion}-${toolsOpen}`}
            session={session}
            state={state}
            open={toolsOpen}
            onClose={() => setToolsOpen(false)}
            onReload={reload}
          />
        </>
      )}
      {confirmation && (
        <EditorConfirmDialog
          {...confirmations[confirmation]}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirm}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  headerRow: { ...s.row, gap: 8 },
  title: { color: c.text, fontSize: 17, fontWeight: '700' },
  subtitle: { color: c.muted, fontSize: 11, marginTop: 3 },
  examBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E3A5F',
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  examText: { color: c.blueLight, fontSize: 10, fontWeight: '600' },
  filename: { color: '#6B7280', fontSize: 10, maxWidth: 150 },
  version: { color: c.muted, fontSize: 10 },
  dot: { height: 5, width: 5, borderRadius: 3 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 20,
  },
  error: { color: c.danger, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#361C24',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 11,
    lineHeight: 17,
    paddingVertical: 8,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#102A24',
  },
  messageText: { color: c.success, fontSize: 11, flex: 1 },
  hint: {
    ...s.between,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderColor: '#1F2937',
  },
  hintText: { color: c.muted, fontSize: 11, lineHeight: 16, flex: 1 },
  footer: {
    ...s.between,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
});
