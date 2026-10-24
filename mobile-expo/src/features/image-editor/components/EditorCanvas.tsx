import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  imageToScreen,
  type TransformContext,
} from '@xiehe/imaging-core/canvas';
import type { ImageSize } from '@xiehe/imaging-core/contracts';
import type { ImageEditorSession } from '@/features/image-editor/application/ImageEditorSession';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { DragPerformanceMonitor } from './interaction/dragPerformance';
import { useCanvasGestures } from './interaction/useCanvasGestures';
import { AnnotationOverlay } from './AnnotationOverlay';
import { EditorButton } from './EditorButton';
import { editorColors as c } from './editorTheme';
export function EditorCanvas({
  session,
  readouts,
  diagnostics,
  showLabels,
  showKeypoints,
  controls,
}: {
  session: ImageEditorSession;
  readouts: EditorReadoutStore;
  diagnostics: DragPerformanceMonitor;
  showLabels: boolean;
  showKeypoints: boolean;
  controls: ReactNode;
}) {
  const [container, setContainer] = useState<ImageSize>({
    width: 1,
    height: 1,
  });
  const [rasterSize, setRasterSize] = useState<ImageSize | null>(null);
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState
  );
  const size = state.imageSize ?? rasterSize;
  const {
    gestures,
    viewport,
    renderedViewport,
    preview: dragPreview,
    zoom,
  } = useCanvasGestures(
    session,
    size,
    container,
    {
      dragging: state.dragging,
      drawing: !!state.drawing,
    },
    diagnostics
  );
  useLayoutEffect(() => {
    if (state.dragging) diagnostics.committed();
  }, [diagnostics, state.dragging, state.history]);
  const context: TransformContext = useMemo(
    () => ({
      ...renderedViewport,
      containerSize: container,
      imageNaturalSize: size,
    }),
    [renderedViewport, container, size]
  );
  const fitContext: TransformContext = {
    ...context,
    imageScale: 1,
    imagePosition: {
      x: 0,
      y: 0,
    },
  };
  const origin = size
    ? imageToScreen(
        {
          x: 0,
          y: 0,
        },
        fitContext
      )
    : {
        x: 0,
        y: 0,
      };
  const bottom = size
    ? imageToScreen(
        {
          x: size.width,
          y: size.height,
        },
        fitContext
      )
    : {
        x: container.width,
        y: container.height,
      };
  const imageTransform = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: viewport.get().imagePosition.x,
      },
      {
        translateY: viewport.get().imagePosition.y,
      },
      {
        scale: viewport.get().imageScale,
      },
    ],
  }));
  const preview = state.drawingPreview.length
    ? {
        id: 'preview',
        type: state.tool,
        points: state.drawingPreview,
        value: '',
      }
    : null;
  return (
    <View
      style={styles.canvas}
      onLayout={event => setContainer(event.nativeEvent.layout)}
    >
      <GestureDetector gesture={gestures}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {state.preview && (
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, imageTransform]}
            >
              <Image
                source={{
                  uri: state.preview.uri,
                }}
                draggable={false}
                cachePolicy="memory"
                contentFit="fill"
                style={
                  size
                    ? {
                        position: 'absolute',
                        left: origin.x,
                        top: origin.y,
                        width: bottom.x - origin.x,
                        height: bottom.y - origin.y,
                      }
                    : StyleSheet.absoluteFill
                }
                onLoad={event => {
                  const loaded = {
                    width: event.source.width,
                    height: event.source.height,
                  };
                  setRasterSize(loaded);
                  session.imageLoaded(loaded, state.preview?.uri);
                }}
                onError={() => session.imageFailed(state.preview?.uri)}
                accessibilityLabel="影像编辑画布"
              />
            </Animated.View>
          )}
          {state.history && state.imageSize && (
            <AnnotationOverlay
              snapshot={state.history.present}
              baseline={session.dragBaseline}
              readouts={readouts}
              viewport={viewport}
              dragPreview={dragPreview}
              context={context}
              selection={state.selection}
              showLabels={showLabels}
              showKeypoints={
                showKeypoints ||
                state.tool === 'keypoint' ||
                state.tool === 'avt'
              }
              draftPoints={state.drawing?.points ?? []}
              preview={preview}
            />
          )}
        </View>
      </GestureDetector>
      {!state.imageReady && !state.error && (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color={c.blueLight} />
          <Text style={styles.caption}>正在加载影像…</Text>
        </View>
      )}
      <ScrollView
        style={[
          styles.shortcuts,
          {
            maxHeight: Math.max(44, container.height - 90),
          },
        ]}
        contentContainerStyle={{
          gap: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {controls}
      </ScrollView>
      <View style={styles.zoom}>
        <EditorButton
          compact
          label="缩小影像"
          icon="remove"
          onPress={() => zoom(1 / 1.25)}
        />
        <Text style={styles.scale}>
          {Math.round(renderedViewport.imageScale * 100)}%
        </Text>
        <EditorButton
          compact
          label="放大影像"
          icon="add"
          onPress={() => zoom(1.25)}
        />
      </View>
      {!!state.preview?.isThumbnail && (
        <View pointerEvents="none" style={styles.previewBadge}>
          <Text style={styles.caption}>服务端预览图</Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    minHeight: 150,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  caption: {
    color: c.muted,
    fontSize: 10,
  },
  shortcuts: {
    position: 'absolute',
    right: 12,
    top: 14,
    width: 44,
  },
  zoom: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827E8',
    borderWidth: 1,
    borderColor: c.border,
    padding: 4,
    borderRadius: 11,
    gap: 4,
  },
  scale: {
    color: c.text,
    fontSize: 11,
    minWidth: 40,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  previewBadge: {
    position: 'absolute',
    bottom: 28,
    right: 14,
    backgroundColor: '#111827CC',
    padding: 6,
    borderRadius: 5,
  },
});
