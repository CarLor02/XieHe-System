import { Modal, StyleSheet, Text, View } from 'react-native';
import { EditorButton } from './EditorButton';
import { editorColors as c } from './editorTheme';

export function EditorConfirmDialog({
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actions}>
            <EditorButton label="取消" onPress={onCancel} />
            <EditorButton
              label={confirmLabel}
              danger={danger}
              primary={!danger}
              onPress={onConfirm}
            />
          </View>
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
    padding: 24,
    backgroundColor: '#000000AA',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 22,
    gap: 16,
  },
  title: { color: c.text, fontSize: 17, fontWeight: '600' },
  description: { color: c.muted, fontSize: 13, lineHeight: 22 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
});
