import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import { getAnnotationConfig } from '@xiehe/imaging-catalog/annotations';
import {
  planDynamicShapeCompletion,
  planSpecialPointToolClick,
  isDynamicShapeTool,
} from '@xiehe/imaging-core/canvas';
import {
  AnnotationSource,
  type AvtTarget,
  type FemoralHeadMode,
  type Point,
} from '@xiehe/imaging-core/contracts';
import type { AnnotationEditorSnapshot } from '@xiehe/imaging-core/editor';
import { upsertKeypoint } from '@xiehe/imaging-core/keypoints';
import {
  assembleInheritedMeasurementPoints,
  createAvtMeasurement,
  getManualMeasurementInheritedPointMap,
  getMeasurementKeypointBindingRuleForMeasurement,
  getLateralCobbPlacementInheritedPointMap,
  getPelvicPlacementInheritedPointMap,
  planManualMeasurementPointClick,
  syncAvailableLateralCobbEndpointsToKeypoints,
  writeMeasurementToKeypoints,
} from '@xiehe/imaging-core/measurement-keypoint-sync';
import {
  planMeasurementAddition,
  type CalculationContext,
} from '@xiehe/imaging-core/measurements';
import {
  createAvtPlacementSession,
  createHorizontalDiscAnchors,
} from '@xiehe/imaging-core/measurements/ap';
import {
  createPelvicMeasurementMetadata,
  getPelvicToolPointCount,
} from '@xiehe/imaging-core/measurements/lateral';
import { synchronizeKeypoints } from './editorSnapshot';
import { measurementCalculator } from './measurementValues';

export interface DrawingSession {
  toolId: string;
  points: Point[];
  inherited: Map<number, Point>;
  pointsNeeded: number;
  pelvicMode?: FemoralHeadMode;
  avtTarget?: AvtTarget;
  cobbEndpoints?: {
    upperVertebra: string | null;
    lowerVertebra: string | null;
  };
}

export interface DrawingOptions {
  pelvicMode?: FemoralHeadMode;
  avtTarget?: AvtTarget;
  cobbEndpoints?: DrawingSession['cobbEndpoints'];
}

export function startDrawing(
  toolId: string,
  snapshot: AnnotationEditorSnapshot,
  examType: string,
  options: DrawingOptions = {}
): DrawingSession {
  const tool = getToolsForExamType(examType).find(t => t.id === toolId);
  if (toolId === 'avt' && !options.avtTarget)
    throw new Error('请先选择 AVT 的顶椎或椎间盘');
  if (!tool && toolId !== 'calibration')
    throw new Error('此检查类型不支持该工具');
  const pelvic = ['pi', 'pt', 'tpa'].includes(toolId);
  const mode =
    options.pelvicMode ??
    (snapshot.keypoints.some(k => k.id === 'FH-1' || k.id === 'FH-2')
      ? 'bilateral'
      : 'single');
  if (
    pelvic &&
    ((mode === 'bilateral' && snapshot.keypoints.some(k => k.id === 'CFH')) ||
      (mode === 'single' &&
        snapshot.keypoints.some(k => k.id === 'FH-1' || k.id === 'FH-2')))
  )
    throw new Error('当前已存在另一种股骨头模式的关键点，请沿用已有模式编辑');
  const pointsNeeded =
    toolId === 'calibration'
      ? 2
      : pelvic
        ? getPelvicToolPointCount(toolId as 'pi' | 'pt' | 'tpa', mode)
        : tool!.pointsNeeded;
  const inherited = pelvic
    ? getPelvicPlacementInheritedPointMap({
        toolId: toolId as 'pi' | 'pt' | 'tpa',
        mode,
        keypoints: snapshot.keypoints,
        measurements: snapshot.measurements,
      })
    : toolId === 'lateral-cobb'
      ? getLateralCobbPlacementInheritedPointMap({
          session: {
            toolId,
            upperVertebra: null,
            lowerVertebra: null,
            ...options.cobbEndpoints,
          },
          keypoints: snapshot.keypoints,
        })
      : getManualMeasurementInheritedPointMap(
          toolId,
          pointsNeeded,
          snapshot.keypoints
        );
  return {
    toolId,
    points: [],
    pointsNeeded,
    inherited,
    ...(pelvic ? { pelvicMode: mode } : {}),
    ...options,
  };
}

export function drawingHint(
  session: DrawingSession,
  snapshot: AnnotationEditorSnapshot
): string {
  if (session.toolId === 'avt' && session.avtTarget) {
    const placement = createAvtPlacementSession(
      session.avtTarget,
      new Set(snapshot.keypoints.map(k => k.id))
    );
    return placement?.step.kind === 'keypoint'
      ? `点选 ${placement.step.keypointId} · ${placement.step.completedCount + 1}/${placement.step.totalCount}`
      : '依次点选椎间盘 a、b 两点';
  }
  if (session.toolId === 'polygon')
    return `已放置 ${session.points.length} 点 · 点击起点闭合，或点“完成多边形”`;
  if (isDynamicShapeTool(session.toolId))
    return '拖动绘制，或依次点选起点和终点';
  const missing = Array.from(
    { length: session.pointsNeeded },
    (_, index) => index
  ).filter(index => !session.inherited.has(index));
  const nextIndex = missing[session.points.length];
  const binding = getMeasurementKeypointBindingRuleForMeasurement({
    id: '',
    type: session.toolId,
    points: [],
    value: '',
    ...(session.pelvicMode
      ? { pelvicMetadata: createPelvicMeasurementMetadata(session.pelvicMode) }
      : {}),
  });
  const detail =
    nextIndex === undefined ? '' : binding?.getDrawingHint?.(nextIndex);
  return `${detail || `点选第 ${(nextIndex ?? 0) + 1} 个点`} · 已放置 ${session.points.length}/${missing.length}${session.inherited.size ? `，复用 ${session.inherited.size} 个已有点` : ''}`;
}

export function placeDrawingPoint(
  session: DrawingSession,
  snapshot: AnnotationEditorSnapshot,
  point: Point,
  pixelsPerImageUnit: number
): {
  session: DrawingSession;
  snapshot: AnnotationEditorSnapshot;
  completion: Point[] | null;
} {
  if (session.toolId === 'avt' && session.avtTarget) {
    const placement = createAvtPlacementSession(
      session.avtTarget,
      new Set(snapshot.keypoints.map(k => k.id))
    );
    if (placement?.step.kind === 'keypoint') {
      const keypoints = upsertKeypoint(snapshot.keypoints, {
        id: placement.step.keypointId,
        point,
        source: AnnotationSource.MANUAL,
        confidence: 1,
      });
      const next = { ...snapshot, keypoints };
      const remaining = createAvtPlacementSession(
        session.avtTarget,
        new Set(keypoints.map(k => k.id))
      );
      return { session, snapshot: next, completion: remaining ? null : [] };
    }
    const points = [...session.points, point];
    return {
      session: { ...session, points },
      snapshot,
      completion:
        points.length === 2
          ? [...createHorizontalDiscAnchors(points[0], points[1])]
          : null,
    };
  }
  if (isDynamicShapeTool(session.toolId)) {
    const points = [...session.points, point];
    const plan =
      points.length === 2
        ? planDynamicShapeCompletion(session.toolId, points[0], points[1])
        : null;
    return {
      session: { ...session, points },
      snapshot,
      completion: plan?.points ?? null,
    };
  }
  const special = planSpecialPointToolClick({
    toolId: session.toolId,
    clickedPoints: session.points,
    point,
    imageScale: pixelsPerImageUnit,
  });
  if (special.handled)
    return {
      session: { ...session, points: special.clickedPoints },
      snapshot,
      completion: special.completion?.points ?? null,
    };
  // 骨盆的槽位由共享布局确定，不能经过按固定工具点数推断的兼容分支。
  if (session.pelvicMode) {
    const points = [...session.points, point];
    return {
      session: { ...session, points },
      snapshot,
      completion:
        points.length === session.pointsNeeded - session.inherited.size
          ? assembleInheritedMeasurementPoints(
              session.pointsNeeded,
              session.inherited,
              points
            )
          : null,
    };
  }
  const plan = planManualMeasurementPointClick({
    toolId: session.toolId,
    pointsNeeded: session.pointsNeeded,
    inheritedPoints: session.inherited,
    clickedPoints: session.points,
    rawPoint: point,
  });
  return {
    session: { ...session, points: plan.clickedPoints },
    snapshot,
    completion: plan.completedPoints,
  };
}

export function completeDrawing(
  session: DrawingSession,
  snapshot: AnnotationEditorSnapshot,
  points: Point[],
  context: CalculationContext,
  createId: () => string
): AnnotationEditorSnapshot {
  if (session.toolId === 'calibration')
    return { ...snapshot, standardDistancePoints: points };
  if (session.avtTarget) {
    const measurement = createAvtMeasurement({
      target: session.avtTarget,
      keypoints: snapshot.keypoints,
      calculationContext: context,
      calculator: measurementCalculator,
      ...(session.avtTarget.type === 'disc'
        ? { discAnchors: [points[0], points[1]] as const }
        : {}),
    });
    if (!measurement) throw new Error('AVT 点位尚未完整，请继续补充');
    return synchronizeKeypoints(
      {
        ...snapshot,
        measurements: [
          ...snapshot.measurements.filter(m => m.id !== measurement.id),
          measurement,
        ],
      },
      snapshot.keypoints,
      context
    );
  }
  const probe = {
    id: '',
    type: session.toolId,
    points,
    value: '',
    ...(session.pelvicMode
      ? { pelvicMetadata: createPelvicMeasurementMetadata(session.pelvicMode) }
      : {}),
  };
  const rule = getMeasurementKeypointBindingRuleForMeasurement(probe);
  const normalizedPoints = rule ? rule.normalizePoints(points).points : points;
  const result = planMeasurementAddition({
    type: session.toolId,
    points: normalizedPoints,
    measurements: snapshot.measurements,
    tools: getToolsForExamType(context.examType ?? ''),
    calculationContext: context,
    options: {
      keypointSynced: rule !== null,
      pelvicMetadata: probe.pelvicMetadata,
      cobbEndpoints: session.cobbEndpoints,
    },
    dependencies: {
      calculator: measurementCalculator,
      createId,
      getDescription: type => getAnnotationConfig(type)?.description ?? type,
      getDefaultValue: () => '辅助标注',
    },
  });
  if (result.status === 'duplicate')
    throw new Error('该测量已存在，请选择并编辑已有点位');
  let keypoints = writeMeasurementToKeypoints(
    snapshot.keypoints,
    result.measurement,
    normalizedPoints
  );
  if (session.cobbEndpoints)
    keypoints = syncAvailableLateralCobbEndpointsToKeypoints(
      keypoints,
      result.measurement
    );
  const next = { ...snapshot, measurements: result.measurements };
  return keypoints !== snapshot.keypoints
    ? synchronizeKeypoints(next, keypoints, context)
    : next;
}
