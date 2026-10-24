import { useState } from 'react';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, IconButton } from '@/shared/ui';

export function ImageViewport({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const flip = useSharedValue(1);
  const [failed, setFailed] = useState(false);
  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.set(scale.get());
    })
    .onUpdate(event => {
      scale.set(Math.max(1, Math.min(5, startScale.get() * event.scale)));
    });
  const pan = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate(event => {
      x.set(startX.get() + event.translationX);
      y.set(startY.get() + event.translationY);
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
      { scaleX: flip.get() },
    ],
  }));
  const reset = () => {
    scale.set(1);
    x.set(0);
    y.set(0);
    flip.set(1);
  };
  return (
    <View style={styles.container}>
      {failed ? (
        <View style={styles.error}>
          <Icon name="image-outline" color="#A6A0B8" size={38} />
          <Text style={styles.hint}>影像加载失败，请刷新页面重试</Text>
        </View>
      ) : (
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
          <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory"
              onError={() => setFailed(true)}
              accessibilityLabel="检查影像，可双指缩放并拖动"
            />
          </Animated.View>
        </GestureDetector>
      )}
      <View style={styles.top}>
        <Text style={styles.hint}>双指缩放 · 单指拖动</Text>
      </View>
      <View style={styles.tools}>
        <IconButton
          name="remove"
          label="缩小影像"
          onPress={() => {
            scale.set(Math.max(1, scale.get() - 0.5));
          }}
        />
        <IconButton
          name="add"
          label="放大影像"
          onPress={() => {
            scale.set(Math.min(5, scale.get() + 0.5));
          }}
        />
        <IconButton
          name="swap-horizontal"
          label="水平翻转"
          onPress={() => {
            flip.set(-flip.get());
          }}
        />
        <IconButton name="refresh-outline" label="重置视图" onPress={reset} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { height: 390, backgroundColor: '#10131D', overflow: 'hidden' },
  top: {
    position: 'absolute',
    top: 14,
    left: 16,
    backgroundColor: '#10131D99',
    padding: 6,
    borderRadius: 8,
  },
  hint: { color: '#CBC7D9', fontSize: 11 },
  tools: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
});
