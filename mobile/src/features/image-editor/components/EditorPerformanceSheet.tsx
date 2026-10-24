import { useSyncExternalStore } from 'react';
import { Modal, StyleSheet, Switch, Text, View } from 'react-native';
import { EditorButton } from './EditorButton';
import { editorColors as c } from './editorTheme';
import type {
  DragPerformanceMonitor,
  TimingSummary,
} from './interaction/dragPerformance';

function summary(label: string, value: TimingSummary) {
  return `${label}：${value.count ? `均值 ${value.mean.toFixed(1)} ms · P95 ${value.p95 === 120 ? '≥120' : value.p95} ms · 最大 ${value.max.toFixed(1)} ms（${value.count} 次）` : '样本不足'}`;
}

export function EditorPerformanceSheet({
  monitor,
  onClose,
}: {
  monitor: DragPerformanceMonitor;
  onClose: () => void;
}) {
  const { enabled, last } = useSyncExternalStore(
    monitor.subscribe,
    monitor.getState,
    monitor.getState
  );
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>画布性能统计</Text>
          <View style={styles.row}>
            <Text style={styles.text}>采集拖动性能</Text>
            <Switch
              accessibilityLabel="采集拖动性能"
              value={enabled}
              onValueChange={value => monitor.setEnabled(value)}
            />
          </View>
          <Text style={styles.note}>
            开启后返回画布，连续拖动一个点位数秒再松手，随后回来查看。仅保留本机最近一次统计，退出编辑页后清除。
          </Text>
          {last ? (
            <>
              <Text style={styles.text}>
                {last.cancelled ? '上次拖动已取消' : '上次拖动已完成'} ·{' '}
                {(last.durationMs / 1000).toFixed(1)} 秒
              </Text>
              <Text style={styles.text}>
                {last.ui.count && last.ui.mean > 0
                  ? `UI 回调频率：${(1000 / last.ui.mean).toFixed(1)} Hz`
                  : 'UI 回调频率：样本不足'}
              </Text>
              <Text style={styles.text}>{summary('UI 回调间隔', last.ui)}</Text>
              <Text style={styles.text}>
                {summary('JS 编辑处理', last.calculation)}
              </Text>
              <Text style={styles.text}>
                {summary('几何提交间隔', last.commit)}
              </Text>
            </>
          ) : (
            <Text style={styles.text}>尚无拖动样本</Text>
          )}
          <Text style={styles.note}>
            UI 回调和 React 提交不等于屏幕实际呈现 FPS。P95
            为毫秒桶近似值；这些数据用于区分主线程、计算和提交瓶颈，不采集影像、点位或患者信息。
          </Text>
          <EditorButton label="返回画布" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: c.panel,
    padding: 20,
    borderRadius: 16,
    gap: 14,
  },
  title: { color: c.text, fontSize: 17, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { color: c.text, fontSize: 12, lineHeight: 20 },
  note: { color: c.muted, fontSize: 11, lineHeight: 18 },
});
