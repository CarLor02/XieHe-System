import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { Gesture } from 'react-native-gesture-handler';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { TransformContext } from '@xiehe/imaging-core/canvas';
import type { ImageSize, Point } from '@xiehe/imaging-core/contracts';
import type { ImageEditorSession } from '../../application/ImageEditorSession';
import { CanvasInteraction } from './CanvasInteraction';
import {
  emptyTimings,
  recordTiming,
  type TimingSamples,
  type DragPerformanceMonitor,
} from './dragPerformance';
import {
  emptyMailbox,
  enqueueMove,
  pinchViewport,
  previewPoint,
  takeMove,
  type DragPlan,
  type DragPreview,
  type MoveMailbox,
  type PanSample,
  type Viewport,
} from './canvasGestureModel';
type GestureState = {
  id: number;
  phase: 'idle' | 'pending' | 'pan' | 'pinch';
  plan: DragPlan | null;
  mailbox: MoveMailbox;
};
const initialViewport: Viewport = {
  imageScale: 1,
  imagePosition: {
    x: 0,
    y: 0,
  },
};
export function useCanvasGestures(
  session: ImageEditorSession,
  imageSize: ImageSize | null,
  container: ImageSize,
  editing: { dragging: boolean; drawing: boolean },
  diagnostics: DragPerformanceMonitor
) {
  const interaction = useMemo(() => new CanvasInteraction(session), [session]);
  const [renderedViewport, setRenderedViewport] = useState(initialViewport);
  const [completedGesture, setCompletedGesture] = useState<number | null>(null);
  const viewport = useSharedValue(initialViewport);
  const preview = useSharedValue<DragPreview>(null);
  const sampling = useSharedValue(false);
  const frameSamples = useSharedValue(emptyTimings());
  const lastSampleTime = useSharedValue<number | null>(null);
  useEffect(() => {
    const sync = () => sampling.set(diagnostics.getState().enabled);
    sync();
    return diagnostics.subscribe(sync);
  }, [diagnostics, sampling]);
  const gestureState = useSharedValue<GestureState>({
    id: 0,
    phase: 'idle',
    plan: null,
    mailbox: emptyMailbox(),
  });
  useLayoutEffect(() => {
    if (completedGesture === null) return;
    // 先提交最终原生控制点坐标，再撤去即时预览，避免松手时闪回上一帧。
    scheduleOnUI((id: number) => {
      if (gestureState.get().id === id && gestureState.get().phase === 'idle')
        preview.set(null);
    }, completedGesture);
  }, [completedGesture, gestureState, preview]);
  const suppressTap = useSharedValue(false);
  const pinchStart = useSharedValue({
    viewport: initialViewport,
    focal: {
      x: 0,
      y: 0,
    },
  });
  const context = useCallback(
    (current: Viewport): TransformContext => ({
      ...current,
      imageNaturalSize: imageSize,
      containerSize: container,
    }),
    [container, imageSize]
  );
  const applyPreview = useCallback(
    (plan: DragPlan, sample: PanSample) => {
      'worklet';

      if (plan.kind === 'viewport') {
        viewport.set({
          ...viewport.get(),
          imagePosition: {
            x: plan.origin.x + sample.translationX,
            y: plan.origin.y + sample.translationY,
          },
        });
      } else if (plan.kind === 'annotation') {
        preview.set({
          selection: plan.selection,
          point: previewPoint(plan, sample),
        });
      }
    },
    [preview, viewport]
  );
  const begin = useCallback(
    (id: number, sample: PanSample, current: Viewport) => {
      diagnostics.begin(id);
      const plan = interaction.begin(id, sample, context(current));
      scheduleOnUI(
        (gestureId: number, next: DragPlan) => {
          const state = gestureState.get();
          // JS 命中检测完成前可能已经松手或开始双指缩放，过期结果不得重新激活手势。
          if (state.id !== gestureId || state.phase !== 'pending') return;
          gestureState.set({
            ...state,
            phase: 'pan',
            plan: next,
          });
          if (state.mailbox.latest) applyPreview(next, state.mailbox.latest);
        },
        id,
        plan
      );
    },
    [applyPreview, context, gestureState, interaction, diagnostics]
  );
  const move = useCallback(
    (id: number, sample: PanSample) => {
      const started = diagnostics.getState().enabled ? performance.now() : null;
      try {
        interaction.move(id, sample);
      } finally {
        if (started !== null)
          diagnostics.calculation(id, performance.now() - started);
        scheduleOnUI((gestureId: number) => {
          const state = gestureState.get();
          if (state.id === gestureId)
            gestureState.set({
              ...state,
              mailbox: {
                ...state.mailbox,
                inFlight: false,
              },
            });
        }, id);
      }
    },
    [gestureState, interaction, diagnostics]
  );

  // 一个 UI 显示帧最多提交一次，且至多一个 JS 计算在途；JS 忙时仅保留最新坐标。
  useFrameCallback(
    useCallback(
      frame => {
        'worklet';

        const state = gestureState.get();
        if (sampling.get() && state.phase === 'pan') {
          const before = lastSampleTime.get();
          if (before !== null)
            frameSamples.set(
              recordTiming(frameSamples.get(), frame.timestamp - before)
            );
          lastSampleTime.set(frame.timestamp);
        }
        if (
          state.phase !== 'pan' ||
          !state.plan ||
          state.plan.kind === 'viewport'
        )
          return;
        const mailbox = takeMove(state.mailbox);
        if (!mailbox) return;
        gestureState.set({
          ...state,
          mailbox,
        });
        scheduleOnRN(move, state.id, mailbox.latest!);
      },
      [gestureState, move, sampling, lastSampleTime, frameSamples]
    )
  );
  const finish = useCallback(
    (
      id: number,
      sample: PanSample,
      current: Viewport,
      frames: TimingSamples
    ) => {
      const finalViewport = interaction.end(id, sample) ?? current;
      setCompletedGesture(id);
      diagnostics.finish(id, frames, false);
      setRenderedViewport(finalViewport);
      scheduleOnUI(
        (gestureId: number, final: Viewport) => {
          if (
            gestureState.get().id === gestureId &&
            gestureState.get().phase === 'idle'
          ) {
            viewport.set(final);
          }
        },
        id,
        finalViewport
      );
    },
    [gestureState, interaction, viewport, diagnostics]
  );
  const cancel = useCallback(
    (id: number, frames: TimingSamples) => {
      interaction.cancel(id);
      diagnostics.finish(id, frames, true);
    },
    [interaction, diagnostics]
  );
  const tap = useCallback(
    (point: Point, current: Viewport) =>
      interaction.tap(point, context(current)),
    [context, interaction]
  );
  const commitViewport = useCallback(
    (current: Viewport) => setRenderedViewport(current),
    []
  );
  useLayoutEffect(() => {
    // 撤销/取消绘图也可由画布外触发，不能让 UI 预览继续跟随已失效的事务。
    scheduleOnUI(
      (dragging: boolean, drawing: boolean) => {
        const state = gestureState.get();
        if (
          state.phase === 'pan' &&
          ((state.plan?.kind === 'annotation' && !dragging) ||
            (state.plan?.kind === 'shape' && !drawing))
        ) {
          gestureState.set({
            ...state,
            phase: 'idle',
            plan: null,
            mailbox: emptyMailbox(),
          });
          preview.set(null);
          scheduleOnRN(cancel, state.id, frameSamples.get());
        }
      },
      editing.dragging,
      editing.drawing
    );
  }, [
    editing.dragging,
    editing.drawing,
    gestureState,
    preview,
    cancel,
    frameSamples,
  ]);
  useEffect(() => {
    interaction.activate();
    return () => {
      interaction.dispose();
      scheduleOnUI(() => {
        gestureState.set({
          id: gestureState.get().id + 1,
          phase: 'idle',
          plan: null,
          mailbox: emptyMailbox(),
        });
        preview.set(null);
      });
    };
  }, [gestureState, interaction, preview]);
  const gestures = useMemo(() => {
    const interrupt = () => {
      'worklet';

      const state = gestureState.get();
      suppressTap.set(true);
      if (state.phase === 'pending' || state.phase === 'pan') {
        scheduleOnRN(cancel, state.id, frameSamples.get());
        gestureState.set({
          ...state,
          phase: 'idle',
          plan: null,
          mailbox: emptyMailbox(),
        });
      }
      preview.set(null);
    };
    const pan = Gesture.Pan()
      .maxPointers(1)
      .minDistance(4)
      .onTouchesDown(event => {
        if (event.numberOfTouches > 1) interrupt();
      })
      .onStart(event => {
        if (gestureState.get().phase === 'pinch') return;
        const id = gestureState.get().id + 1;
        if (sampling.get()) {
          frameSamples.set(emptyTimings());
          lastSampleTime.set(null);
        }
        gestureState.set({
          id,
          phase: 'pending',
          plan: null,
          mailbox: enqueueMove(emptyMailbox(), event),
        });
        scheduleOnRN(begin, id, event, viewport.get());
      })
      .onUpdate(event => {
        const state = gestureState.get();
        if (
          event.numberOfPointers !== 1 ||
          (state.phase !== 'pan' && state.phase !== 'pending')
        )
          return;
        gestureState.set({
          ...state,
          mailbox: enqueueMove(state.mailbox, event),
        });
        if (state.plan) applyPreview(state.plan, event);
      })
      .onEnd((event, success) => {
        const state = gestureState.get();
        if (!success || (state.phase !== 'pan' && state.phase !== 'pending'))
          return;
        if (state.plan) applyPreview(state.plan, event);
        gestureState.set({
          ...state,
          phase: 'idle',
          mailbox: emptyMailbox(),
        });
        scheduleOnRN(
          finish,
          state.id,
          event,
          viewport.get(),
          frameSamples.get()
        );
      })
      .onFinalize((_event, success) => {
        const phase = gestureState.get().phase;
        if (!success && (phase === 'pan' || phase === 'pending')) interrupt();
      });
    const pinch = Gesture.Pinch()
      .onStart(event => {
        interrupt();
        pinchStart.set({
          viewport: viewport.get(),
          focal: {
            x: event.focalX,
            y: event.focalY,
          },
        });
        gestureState.set({
          ...gestureState.get(),
          phase: 'pinch',
        });
      })
      .onUpdate(event => {
        const start = pinchStart.get();
        viewport.set(
          pinchViewport(
            start.viewport,
            start.focal,
            {
              x: event.focalX,
              y: event.focalY,
            },
            event.scale,
            {
              x: container.width / 2,
              y: container.height / 2,
            }
          )
        );
      })
      .onFinalize(() => {
        if (gestureState.get().phase !== 'pinch') return;
        gestureState.set({
          ...gestureState.get(),
          phase: 'idle',
        });
        scheduleOnRN(commitViewport, viewport.get());
      });
    const tapGesture = Gesture.Tap()
      .maxDistance(8)
      .maxDuration(450)
      .onBegin(() => {
        suppressTap.set(false);
      })
      .onTouchesDown(event => {
        if (event.numberOfTouches > 1) interrupt();
      })
      .onEnd((event, success) => {
        if (
          success &&
          !suppressTap.get() &&
          gestureState.get().phase !== 'pinch'
        )
          scheduleOnRN(
            tap,
            {
              x: event.x,
              y: event.y,
            },
            viewport.get()
          );
      });
    return Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tapGesture));
  }, [
    applyPreview,
    begin,
    cancel,
    commitViewport,
    container.height,
    container.width,
    finish,
    gestureState,
    pinchStart,
    preview,
    suppressTap,
    tap,
    viewport,
    sampling,
    frameSamples,
    lastSampleTime,
  ]);
  const zoom = useCallback(
    (factor: number) => {
      scheduleOnUI(() => {
        if (gestureState.get().phase !== 'idle') return;
        const current = viewport.get();
        const next = {
          ...current,
          imageScale: Math.max(0.5, Math.min(8, current.imageScale * factor)),
        };
        viewport.set(next);
        scheduleOnRN(commitViewport, next);
      });
    },
    [commitViewport, gestureState, viewport]
  );
  return {
    gestures,
    viewport,
    renderedViewport,
    preview,
    zoom,
  };
}
