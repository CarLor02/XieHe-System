import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { editorColors as c } from './editorTheme';

export function EditorAnalysisOverlay() {
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      // 当前 AI 请求不支持取消；返回键不能只关闭遮罩而让请求继续占用编辑会话。
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View
          style={styles.indicator}
          accessibilityRole="progressbar"
          accessibilityLabel="正在运行 AI 测量"
          accessibilityState={{ busy: true }}
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="large" color={c.blueLight} />
          <Text style={styles.label}>正在运行 AI 测量…</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000088',
  },
  indicator: {
    alignItems: 'center',
    gap: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: c.panel,
  },
  label: { color: c.text, fontSize: 14 },
});
