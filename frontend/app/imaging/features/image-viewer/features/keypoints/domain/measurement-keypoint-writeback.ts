/**
 * 测量点 → vertebraeLayer 反向写回
 *
 * 当用户拖拽测量点时，将该点的新位置同步回对应的 vertebraeLayer 角点，
 * 保持 vertebraeLayer 与 measurements[] 的一致性。
 *
 * Cobb 和辅助图形不参与写回（不在映射表中即跳过）。
 * 侧位：写回椎体角点（VertebraTarget）、S1（S1Target）、CFH（CfhTarget）。
 * 正位：写回 AP 姿态关键点（ApPoseTarget），如 CL/CR（CA）、IL/IR（PO）、SL/SR（CSS）。
 */

import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import {
  AnnotationSource,
  CfhAnnotation,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

type VertebraTarget = {
  kind: 'vertebra';
  vertebraLabel: string;
  endplate: 'upper' | 'lower';
  /** anterior = 较大 X（前方），posterior = 较小 X（后方） */
  side: 'anterior' | 'posterior';
};

type S1Target = {
  kind: 's1';
  /** 0 = sortSacralEndplate 后 index 0（较大 X），1 = index 1（较小 X） */
  s1UpperIndex: 0 | 1;
};

/** SVA 的 S1 后缘参考点（固定对应 vertebraeLayer 中 S1.corners[1]） */
type S1PosteriorTarget = { kind: 's1-posterior' };

type CfhTarget = { kind: 'cfh' };

/**
 * 正位姿态关键点（CL/CR/IL/IR/SL/SR）写回目标。
 * vertebraeLayer 中这些点以 label=keypointId、corners[0]=point 的形式存储。
 */
type ApPoseTarget = { kind: 'ap-pose'; keypointId: string };

/**
 * 正位椎体角点写回目标。
 * completeVertebraLayers 将关键点 `${group}-1..4` 按顺序放入 corners[0..3]：
 *   corners[0]=topLeft(T1-1), corners[1]=topRight(T1-2),
 *   corners[2]=bottomLeft(T1-3), corners[3]=bottomRight(T1-4)
 */
type ApVertebraCornerTarget = {
  kind: 'ap-vertebra';
  label: string;
  cornerIndex: 0 | 1 | 2 | 3;
};

/**
 * 正位动态椎体角点写回目标。
 * 椎体标签由运行时传入（如 AVT 的顶锥名称），不在映射表中静态指定。
 */
type ApVertebraDynamicTarget = {
  kind: 'ap-vertebra-dynamic';
  cornerIndex: 0 | 1 | 2 | 3;
};

type WritebackTarget =
  | VertebraTarget
  | S1Target
  | S1PosteriorTarget
  | CfhTarget
  | ApPoseTarget
  | ApVertebraCornerTarget
  | ApVertebraDynamicTarget;

// ─── 映射表（measurement type → 每个 pointIndex 对应的 vertebraeLayer 目标）──

const WRITEBACK_MAP: Record<string, WritebackTarget[]> = {
  't1-slope': [
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'upper', side: 'posterior' },
  ],
  'tk-t2-t5': [
    { kind: 'vertebra', vertebraLabel: 'T2', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T2', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'T5', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T5', endplate: 'lower', side: 'posterior' },
  ],
  'tk-t5-t12': [
    { kind: 'vertebra', vertebraLabel: 'T5', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T5', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'T12', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T12', endplate: 'lower', side: 'posterior' },
  ],
  't10-l2': [
    { kind: 'vertebra', vertebraLabel: 'T10', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T10', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'L2', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'L2', endplate: 'lower', side: 'posterior' },
  ],
  'll-l1-s1': [
    { kind: 'vertebra', vertebraLabel: 'L1', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'L1', endplate: 'upper', side: 'posterior' },
    { kind: 's1', s1UpperIndex: 0 },
    { kind: 's1', s1UpperIndex: 1 },
  ],
  'll-l1-l4': [
    { kind: 'vertebra', vertebraLabel: 'L1', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'L1', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'L4', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'L4', endplate: 'lower', side: 'posterior' },
  ],
  'll-l4-s1': [
    { kind: 'vertebra', vertebraLabel: 'L4', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'L4', endplate: 'upper', side: 'posterior' },
    { kind: 's1', s1UpperIndex: 0 },
    { kind: 's1', s1UpperIndex: 1 },
  ],
  'sva': [
    { kind: 'vertebra', vertebraLabel: 'C7', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'C7', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'C7', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'C7', endplate: 'lower', side: 'posterior' },
    { kind: 's1-posterior' },
  ],
  'tpa': [
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'upper', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'upper', side: 'posterior' },
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'lower', side: 'anterior' },
    { kind: 'vertebra', vertebraLabel: 'T1', endplate: 'lower', side: 'posterior' },
    { kind: 'cfh' },
    { kind: 's1', s1UpperIndex: 0 },
    { kind: 's1', s1UpperIndex: 1 },
  ],
  'pi':  [{ kind: 'cfh' }, { kind: 's1', s1UpperIndex: 0 }, { kind: 's1', s1UpperIndex: 1 }],
  'pt':  [{ kind: 'cfh' }, { kind: 's1', s1UpperIndex: 0 }, { kind: 's1', s1UpperIndex: 1 }],
  'ss':  [{ kind: 's1', s1UpperIndex: 0 }, { kind: 's1', s1UpperIndex: 1 }],

  // ── 正位 AP 姿态关键点写回 ──────────────────────────────────────────────────
  // CA（锁骨角）：points[0]=CR, points[1]=CL（与 deriveAnterior 顺序一致）
  'ca':  [{ kind: 'ap-pose', keypointId: 'CR' }, { kind: 'ap-pose', keypointId: 'CL' }],
  // PO（骨盆倾斜角）：points[0]=IR, points[1]=IL
  'po':  [{ kind: 'ap-pose', keypointId: 'IR' }, { kind: 'ap-pose', keypointId: 'IL' }],
  // CSS（冠状面骶骨倾斜角）：points[0]=SR, points[1]=SL
  'css': [{ kind: 'ap-pose', keypointId: 'SR' }, { kind: 'ap-pose', keypointId: 'SL' }],

  // ── 正位 AP 椎体角点写回 ──────────────────────────────────────────────────
  // T1 Tilt：points[0]=t1.topLeft=corners[0](T1-1), points[1]=t1.topRight=corners[1](T1-2)
  // completeVertebraLayers 按 [1,2,3,4] 顺序填充 corners：
  //   corners[0]=topLeft, corners[1]=topRight, corners[2]=bottomLeft, corners[3]=bottomRight
  't1-tilt': [
    { kind: 'ap-vertebra', label: 'T1', cornerIndex: 0 },
    { kind: 'ap-vertebra', label: 'T1', cornerIndex: 1 },
  ],
  // TS：6点格式 [tl, tr, bl, br, SR, SL]
  // points[0..3] → C7 四个角点；points[4..5] → 骶骨参考点 SR/SL
  'ts': [
    { kind: 'ap-vertebra', label: 'C7', cornerIndex: 0 },
    { kind: 'ap-vertebra', label: 'C7', cornerIndex: 1 },
    { kind: 'ap-vertebra', label: 'C7', cornerIndex: 2 },
    { kind: 'ap-vertebra', label: 'C7', cornerIndex: 3 },
    { kind: 'ap-pose', keypointId: 'SR' },
    { kind: 'ap-pose', keypointId: 'SL' },
  ],
  // AVT：6点格式 [tl, tr, bl, br, SR, SL]
  // points[0..3] → 顶锥四个角点（椎体标签由运行时动态传入）；points[4..5] → SR/SL
  'avt': [
    { kind: 'ap-vertebra-dynamic', cornerIndex: 0 },
    { kind: 'ap-vertebra-dynamic', cornerIndex: 1 },
    { kind: 'ap-vertebra-dynamic', cornerIndex: 2 },
    { kind: 'ap-vertebra-dynamic', cornerIndex: 3 },
    { kind: 'ap-pose', keypointId: 'SR' },
    { kind: 'ap-pose', keypointId: 'SL' },
  ],
};

// ─── 辅助：更新椎体角点 ──────────────────────────────────────────────────────

/**
 * 在给定椎体的 4 个角点中，找到对应终板位置的角点并替换为 newPoint。
 * 使用 extractEndplateLateral 相同的逻辑（Y 排序找上/下，X 排序找前/后）。
 */
function updateVertebraCorner(
  corners: [Point, Point, Point, Point],
  endplate: 'upper' | 'lower',
  side: 'anterior' | 'posterior',
  newPoint: Point
): [Point, Point, Point, Point] {
  const indexed = corners.map((c, i) => ({ c, i }));
  const byY = [...indexed].sort((a, b) => a.c.y - b.c.y);
  const pair = endplate === 'upper' ? byY.slice(0, 2) : byY.slice(2);
  const [ant, pos] =
    pair[0].c.x > pair[1].c.x ? [pair[0], pair[1]] : [pair[1], pair[0]];
  const target = side === 'anterior' ? ant : pos;
  const next = [...corners] as [Point, Point, Point, Point];
  next[target.i] = newPoint;
  return next;
}

// ─── 辅助：更新 S1 角点 ──────────────────────────────────────────────────────

function updateS1(
  vertebraeLayer: VertebraAnnotation[],
  s1UpperIndex: 0 | 1,
  newPoint: Point
): VertebraAnnotation[] {
  // 单条 S1 记录（corners[0]=左, corners[1]=右，但排序基于 X）
  const hasSingleS1 = vertebraeLayer.some(v => v.label === 'S1');
  if (hasSingleS1) {
    return vertebraeLayer.map(v => {
      if (v.label !== 'S1') return v;
      const next = [...v.corners] as [Point, Point, Point, Point];
      const c0Larger = v.corners[0].x >= v.corners[1].x;
      if (s1UpperIndex === 0) next[c0Larger ? 0 : 1] = newPoint;
      else next[c0Larger ? 1 : 0] = newPoint;
      return { ...v, corners: next, source: AnnotationSource.MANUAL };
    });
  }
  // 分离的 S1-1 / S1-2 记录（每条 corners[0] 为实际坐标）
  const s1Point1 = vertebraeLayer.find(v => v.label === 'S1-1');
  const s1Point2 = vertebraeLayer.find(v => v.label === 'S1-2');
  if (!s1Point1 || !s1Point2) return vertebraeLayer;
  const s1Point1IsLargerX = s1Point1.corners[0].x >= s1Point2.corners[0].x;
  const targetLabel =
    (s1UpperIndex === 0) === s1Point1IsLargerX ? 'S1-1' : 'S1-2';
  return vertebraeLayer.map(v => {
    if (v.label !== targetLabel) return v;
    const next = [...v.corners] as [Point, Point, Point, Point];
    next[0] = newPoint;
    return { ...v, corners: next, source: AnnotationSource.MANUAL };
  });
}

// ─── 辅助：更新 S1 posterior（SVA 用）────────────────────────────────────────

function updateS1Posterior(
  vertebraeLayer: VertebraAnnotation[],
  newPoint: Point
): VertebraAnnotation[] {
  const hasSingleS1 = vertebraeLayer.some(v => v.label === 'S1');
  if (hasSingleS1) {
    // S1 posterior = corners[1]（s1p2）
    return vertebraeLayer.map(v => {
      if (v.label !== 'S1') return v;
      const next = [...v.corners] as [Point, Point, Point, Point];
      next[1] = newPoint;
      return { ...v, corners: next, source: AnnotationSource.MANUAL };
    });
  }
  // 分离形式：S1-2 对应 s1p2（posterior）
  return vertebraeLayer.map(v => {
    if (v.label !== 'S1-2') return v;
    const next = [...v.corners] as [Point, Point, Point, Point];
    next[0] = newPoint;
    return { ...v, corners: next, source: AnnotationSource.MANUAL };
  });
}

// ─── 主导出函数 ───────────────────────────────────────────────────────────────

export interface WritebackResult {
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
}

/**
 * 将测量点的新坐标写回 vertebraeLayer / cfhAnnotation。
 *
 * @param vertebraeLayer       当前椎体角点层
 * @param cfhAnnotation        当前股骨头标注
 * @param measurementType      被拖拽的测量类型（如 'pi', 't1-slope'）
 * @param pointIndex           被拖拽的 points[] 索引
 * @param newPoint             新的图像坐标
 * @param dynamicVertebraLabel 动态椎体标签（用于 AVT 等顶锥可变的情况）
 * @returns 更新后的 vertebraeLayer 和 cfhAnnotation（未改变时返回原引用）
 */
export function applyMeasurementPointToVertebrae(
  vertebraeLayer: VertebraAnnotation[],
  cfhAnnotation: CfhAnnotation | null,
  measurementType: string,
  pointIndex: number,
  newPoint: Point,
  dynamicVertebraLabel?: string
): WritebackResult {
  const typeId = getAnnotationTypeId(measurementType);
  const targets = WRITEBACK_MAP[typeId];
  if (!targets || pointIndex >= targets.length) {
    return { vertebraeLayer, cfhAnnotation };
  }

  const target = targets[pointIndex];
  if (!target) return { vertebraeLayer, cfhAnnotation };

  let nextLayer = vertebraeLayer;
  let nextCfh = cfhAnnotation;

  if (target.kind === 'vertebra') {
    const { vertebraLabel, endplate, side } = target;
    nextLayer = vertebraeLayer.map(v => {
      if (v.label !== vertebraLabel) return v;
      return {
        ...v,
        corners: updateVertebraCorner(v.corners, endplate, side, newPoint),
        source: AnnotationSource.MANUAL,
      };
    });
  } else if (target.kind === 's1') {
    nextLayer = updateS1(vertebraeLayer, target.s1UpperIndex, newPoint);
  } else if (target.kind === 's1-posterior') {
    nextLayer = updateS1Posterior(vertebraeLayer, newPoint);
  } else if (target.kind === 'cfh') {
    // 更新 CfhAnnotation 对象
    nextCfh = {
      center: newPoint,
      confidence: 1,
      source: AnnotationSource.MANUAL,
    };
    // 同时更新 vertebraeLayer 中 CFH 记录（若存在）
    nextLayer = vertebraeLayer.map(v => {
      if (v.label !== 'CFH') return v;
      const next = [...v.corners] as [Point, Point, Point, Point];
      next[0] = newPoint;
      return { ...v, corners: next, source: AnnotationSource.MANUAL };
    });
  } else if (target.kind === 'ap-pose') {
    // 正位姿态关键点：以 label=keypointId 的单点记录形式存储于 vertebraeLayer。
    // vertebraeLayerToAnteriorKeypoints 读取 corners[0]，因此只需更新 corners[0]。
    const { keypointId } = target;
    nextLayer = vertebraeLayer.map(v => {
      if (v.label !== keypointId) return v;
      const next = [...v.corners] as [Point, Point, Point, Point];
      next[0] = newPoint;
      return { ...v, corners: next, source: AnnotationSource.MANUAL };
    });
  } else if (target.kind === 'ap-vertebra' || target.kind === 'ap-vertebra-dynamic') {
    // 正位椎体角点写回，支持两种 vertebraeLayer 存储格式：
    // 1. 分组格式（keypointsToDerivedLayer 产生）：{label:'T1', corners:[tl,tr,bl,br]}
    //    → 直接更新 corners[cornerIndex]
    // 2. 独立关键点格式（keypointsToPersistedLayer 产生）：{label:'T1-1', corners:[pt,...]}, ...
    //    → 找到 label='T1-${cornerIndex+1}' 的条目，更新其 corners[0]
    const cornerIndex = target.cornerIndex;
    const label =
      target.kind === 'ap-vertebra'
        ? target.label
        : dynamicVertebraLabel ?? null;
    if (!label) return { vertebraeLayer, cfhAnnotation }; // 动态标签未提供时跳过
    const hasGrouped = vertebraeLayer.some(v => v.label === label);
    if (hasGrouped) {
      nextLayer = vertebraeLayer.map(v => {
        if (v.label !== label) return v;
        const next = [...v.corners] as [Point, Point, Point, Point];
        next[cornerIndex] = newPoint;
        return { ...v, corners: next, source: AnnotationSource.MANUAL };
      });
    } else {
      // 独立关键点格式：T1-1 = corners[0], T1-2 = corners[1], ...
      const keypointLabel = `${label}-${cornerIndex + 1}`;
      nextLayer = vertebraeLayer.map(v => {
        if (v.label !== keypointLabel) return v;
        const next = [...v.corners] as [Point, Point, Point, Point];
        next[0] = newPoint;
        return { ...v, corners: next, source: AnnotationSource.MANUAL };
      });
    }
  }

  return { vertebraeLayer: nextLayer, cfhAnnotation: nextCfh };
}
