import type { PropsWithChildren } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '../../theme';
import { IconButton } from '../icon-button';

export function ChoiceSheet({
  title,
  open,
  onClose,
  children,
}: PropsWithChildren<{ title: string; open: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="关闭弹窗"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={styles.handle} />
          <View style={layout.between}>
            <Text style={layout.heading}>{title}</Text>
            <IconButton name="close" label="关闭" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ gap: 10, paddingTop: 16 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#0F172A66',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#DCE1EA',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 18,
  },
});
