import { memo, useMemo, useSyncExternalStore } from 'react';
import { Text as SvgText } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import {
  imageToScreen,
  getBilateralPelvicGeometryOwnerId,
  type TransformContext,
  type DrawingPrimitive,
} from '@xiehe/imaging-core/canvas';
import {
  getAdaptiveFontSize,
  getAnnotationDisplayName,
  getAnnotationTypeId,
  getColorForType,
  getLabelPositionForType,
} from '@xiehe/imaging-catalog/annotations';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import type { EditorReadoutStore } from '@/features/image-editor/application/EditorReadoutStore';
import type { EditorSelection } from '@/features/image-editor/application/dragAnnotation';
import type { Viewport } from './interaction/canvasGestureModel';
import { getAvtLabelPosition } from '@xiehe/imaging-core/measurements/ap';
import { measurementGeometry } from './measurementGeometry';
import { clippedDrawingBounds } from './annotationLayers';
import { SvgLayer } from './SvgLayer';

/** 标签订阅低频读数；高频几何更新不进入文字绘制层。 */
export const AnnotationLabels = memo(function AnnotationLabels({
  readouts,
  context,
  viewport,
  selection,
  showKeypoints,
}: {
  readouts: EditorReadoutStore;
  context: TransformContext;
  viewport: SharedValue<Viewport>;
  selection: EditorSelection | null;
  showKeypoints: boolean;
}) {
  const state = useSyncExternalStore(
    readouts.subscribe,
    readouts.getState,
    readouts.getState
  );
  const snapshot = state.history?.present;
  const { imageScale, imageNaturalSize, containerSize } = context;
  const projection = useMemo(
    () => ({
      imageScale,
      imageNaturalSize,
      containerSize,
      imagePosition: { x: 0, y: 0 },
    }),
    [imageScale, imageNaturalSize, containerSize]
  );
  const labels = useMemo(
    () =>
      snapshot
        ? buildLabels(snapshot, projection, selection, showKeypoints)
        : [],
    [snapshot, projection, selection, showKeypoints]
  );
  // 使用保守的字形范围，多留一个字符的余量来覆盖字体边缘。
  const corners = labels.flatMap(({ x, y, fontSize, text, middle }) => {
    const width = (text.length + 1) * fontSize * 1.5;
    return [
      { x: middle ? x - width / 2 : x, y: y - fontSize * 1.5 },
      { x: x + (middle ? width / 2 : width), y: y + fontSize },
    ];
  });
  const bounds = clippedDrawingBounds(
    corners,
    projection,
    context.imagePosition,
    0
  );
  if (!bounds) return null;
  return (
    <SvgLayer context={projection} viewport={viewport} bounds={bounds}>
      {labels.map(label => (
        <SvgText
          key={label.key}
          x={label.x}
          y={label.y}
          fill={label.color}
          fontSize={label.fontSize}
          fontWeight={label.weight}
          textAnchor={label.middle ? 'middle' : 'start'}
        >
          {label.text}
        </SvgText>
      ))}
    </SvgLayer>
  );
});

type Label = {
  key: string;
  x: number;
  y: number;
  fontSize: number;
  text: string;
  color: string;
  middle?: boolean;
  weight?: '500';
};

function buildLabels(
  snapshot: AnnotationEditorSnapshot,
  context: TransformContext,
  selection: EditorSelection | null,
  showKeypoints: boolean
): Label[] {
  const labels: Label[] = [];
  const owner = getBilateralPelvicGeometryOwnerId(
    snapshot.measurements,
    () => false
  );
  for (const m of snapshot.measurements) {
    if (!m.points.length) continue;
    const type = getAnnotationTypeId(m.type);
    const point = imageToScreen(
      type === 'avt'
        ? getAvtLabelPosition(m)
        : getLabelPositionForType(m.type, m.points, context.imageScale),
      context
    );
    const color = getColorForType(m.type);
    labels.push({
      key: `value:${m.id}`,
      x: point.x + 19,
      y: point.y - 10,
      text: `${getAnnotationDisplayName(m.type)}${m.value ? `  ${m.value}` : ''}`,
      fontSize: getAdaptiveFontSize(context.imageScale),
      color:
        selection &&
        'measurementId' in selection &&
        selection.measurementId === m.id
          ? '#FBBF24'
          : color,
      weight: '500',
    });
    if (type === 'hemipelvic-width-ratio' || m.id === owner) {
      const append = (p: DrawingPrimitive) => {
        if (p.kind === 'vertebra') p.children.forEach(append);
        if (p.kind === 'text')
          labels.push({
            key: `detail:${m.id}:${p.text}`,
            ...p.point,
            text: p.text,
            fontSize: p.fontSize,
            color: p.fill && p.fill !== 'currentColor' ? p.fill : color,
            middle: p.text !== 'CFH',
            weight: '500',
          });
      };
      measurementGeometry(m, context, {
        renderPelvicSharedGeometry: m.id === owner,
        calculationContext: {
          standardDistance: snapshot.standardDistance,
          standardDistancePoints: snapshot.standardDistancePoints,
          imageNaturalSize: context.imageNaturalSize,
        },
      }).forEach(append);
    }
  }
  if (showKeypoints)
    for (const kp of snapshot.keypoints) {
      if (selection?.kind === 'keypoint' && selection.keypointId === kp.id)
        continue;
      const p = imageToScreen(kp.point, context);
      labels.push({
        key: `keypoint:${kp.id}`,
        x: p.x + 8,
        y: p.y - 7,
        text: kp.id,
        color: '#6EE7B7',
        fontSize: 10,
      });
    }
  if (snapshot.standardDistancePoints.length === 2) {
    const [a, b] = snapshot.standardDistancePoints.map(p =>
      imageToScreen(p, context)
    );
    labels.push({
      key: 'calibration',
      x: (a.x + b.x) / 2 + 7,
      y: (a.y + b.y) / 2 - 8,
      color: '#FBBF24',
      fontSize: 11,
      text: `${snapshot.standardDistance} mm`,
    });
  }
  return labels;
}
