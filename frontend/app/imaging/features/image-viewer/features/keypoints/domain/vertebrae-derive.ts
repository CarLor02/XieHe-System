/**
 * 椎体角点 → 测量数据推导函数
 *
 * 移植自后端：
 *   侧位：model/cemian/keypoints_service.py
 *   正位：model/zhengmian/app.py
 *
 * corners 约定（与 aiDetectionUseCase 保持一致）：
 *   [0]=TL(左上)  [1]=TR(右上)  [2]=BL(左下)  [3]=BR(右下)
 * 坐标系：图像像素坐标（左上角为原点，y 向下）
 */

import {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types';
import { isLateralVertebraLabel } from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import {
  keypointsToDerivedLayer,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function calcAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function centroid(...pts: Point[]): Point {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

function makeMeasurement(type: string, points: Point[]): MeasurementData {
  return {
    id: `vertebrae-derived-${type.toLowerCase().replace(/[\s/]+/g, '-')}`,
    type,
    value: '',
    points,
    description: `[推导] ${type}`,
  };
}

// ─── 侧位终板提取 ─────────────────────────────────────────────────────────

interface Endplates {
  upper: [Point, Point]; // [Tn-1, Tn-2]
  lower: [Point, Point]; // [Tn-3, Tn-4]
  center: Point;
}

function extractEndplateLateral(
  corners: [Point, Point, Point, Point]
): Endplates {
  return {
    upper: [corners[0], corners[1]],
    lower: [corners[2], corners[3]],
    center: centroid(...corners),
  };
}

// ─── 侧位推导（移植自 keypoints_service.compute_keypoints）─────────────────

function sortSacralEndplate(points: [Point, Point]): [Point, Point] {
  const [p1, p2] = points;
  return p1.x >= p2.x ? [p1, p2] : [p2, p1];
}

function deriveLateral(
  vertebraeLayer: VertebraAnnotation[],
  cfhAnnotation: CfhAnnotation | null
): MeasurementData[] {
  const ep: Record<string, Endplates> = {};
  const sacralPoints = new Map<string, Point>();
  let cfh = cfhAnnotation?.center ?? null;

  vertebraeLayer.forEach(v => {
    if (v.label === 'CFH') {
      cfh = v.corners[0];
      return;
    }
    if (v.label === 'S1') {
      sacralPoints.set('S1-1', v.corners[0]);
      sacralPoints.set('S1-2', v.corners[1]);
      return;
    }
    if (v.label === 'S1-1' || v.label === 'S1-2') {
      sacralPoints.set(v.label, v.corners[0]);
      return;
    }
    if (isLateralVertebraLabel(v.label)) {
      ep[v.label] = extractEndplateLateral(v.corners);
    }
  });

  const out: MeasurementData[] = [];
  const has = (...labels: string[]) => labels.every(l => ep[l]);
  const s1p1 = sacralPoints.get('S1-1');
  const s1p2 = sacralPoints.get('S1-2');
  const s1Upper = s1p1 && s1p2 ? sortSacralEndplate([s1p1, s1p2]) : null;
  // 业务定义中 SVA 使用 S1 后上点；当前关键点命名约定为 S1-2。
  const s1Posterior = s1p2 ?? null;

  if (has('T1')) out.push(makeMeasurement('T1 Slope', [...ep['T1'].upper]));
  if (has('C2', 'C7'))
    out.push(
      makeMeasurement('C2-C7 CL', [...ep['C2'].lower, ...ep['C7'].lower])
    );
  if (has('T2', 'T5'))
    out.push(
      makeMeasurement('TK T2-T5', [...ep['T2'].upper, ...ep['T5'].lower])
    );
  if (has('T5', 'T12'))
    out.push(
      makeMeasurement('TK T5-T12', [...ep['T5'].upper, ...ep['T12'].lower])
    );
  if (has('T10', 'L2'))
    out.push(
      makeMeasurement('T10-L2', [...ep['T10'].upper, ...ep['L2'].lower])
    );
  if (has('L1') && s1Upper)
    out.push(makeMeasurement('LL L1-S1', [...ep['L1'].upper, ...s1Upper]));
  if (has('L1', 'L4'))
    out.push(
      makeMeasurement('LL L1-L4', [...ep['L1'].upper, ...ep['L4'].lower])
    );
  if (has('L4') && s1Upper)
    out.push(makeMeasurement('LL L4-S1', [...ep['L4'].upper, ...s1Upper]));

  if (has('C7') && s1Posterior) {
    // 与手动交互格式一致：4个C7角点（上终板前/后、下终板前/后）+ S1参考点
    out.push(
      makeMeasurement('SVA', [
        ...ep['C7'].upper, // upper[0]=前角, upper[1]=后角
        ...ep['C7'].lower, // lower[0]=前角, lower[1]=后角
        s1Posterior,
      ])
    );
  }

  if (has('T1') && s1Upper && cfh) {
    out.push(
      makeMeasurement('TPA', [
        ep['T1'].upper[0],
        ep['T1'].upper[1],
        ep['T1'].lower[0],
        ep['T1'].lower[1],
        cfh,
        s1Upper[0],
        s1Upper[1],
      ])
    );
  }

  if (s1Upper && cfh) {
    const piPts = [cfh, s1Upper[0], s1Upper[1]];
    out.push(makeMeasurement('PI', piPts));
    out.push(makeMeasurement('PT', [...piPts]));
  }

  if (s1Upper) {
    out.push(makeMeasurement('SS', [...s1Upper]));
  }

  return out;
}

// ─── 正位工具（移植自 zhengmian/app.py）────────────────────────────────────

interface FrontalCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
  topMid: Point;
  bottomMid: Point;
  center: Point;
}

function buildFrontalCorners(v: VertebraAnnotation): FrontalCorners {
  const [tl, tr, bl, br] = v.corners;
  return {
    topLeft: tl,
    topRight: tr,
    bottomLeft: bl,
    bottomRight: br,
    topMid: midpoint(tl, tr),
    bottomMid: midpoint(bl, br),
    center: centroid(tl, tr, bl, br),
  };
}

function cobbAngle(ul: Point, ur: Point, ll: Point, lr: Point): number {
  const upperAngle = calcAngle(ul, ur);
  const lowerAngle = calcAngle(ll, lr);
  let magnitude = Math.abs(upperAngle - lowerAngle);
  if (magnitude > 180) magnitude = 360 - magnitude;
  const leftDist = Math.abs(ll.y - ul.y);
  const rightDist = Math.abs(lr.y - ur.y);
  return leftDist > rightDist ? magnitude : -magnitude;
}

const VERTEBRA_LABELS = new Set([
  'C7',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'T10',
  'T11',
  'T12',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
]);
const POSE_LABELS = new Set(['CR', 'CL', 'IR', 'IL', 'SR', 'SL']);

function findCobbAngles(
  vertebraeFrontal: Map<string, FrontalCorners>
): MeasurementData[] {
  const results: MeasurementData[] = [];
  const usedApex = new Set<string>();

  const regions: { name: string; range: string[] }[] = [
    { name: 'Thoracolumbar', range: ['T12', 'L1'] },
    {
      name: 'Thoracic',
      range: [
        'T2',
        'T3',
        'T4',
        'T5',
        'T6',
        'T7',
        'T8',
        'T9',
        'T10',
        'T11',
        'T12',
      ],
    },
    { name: 'Lumbar', range: ['L2', 'L3', 'L4', 'L5'] },
  ];

  for (const region of regions) {
    const available = new Map<string, FrontalCorners>();
    region.range.forEach(name => {
      if (vertebraeFrontal.has(name))
        available.set(name, vertebraeFrontal.get(name)!);
    });
    if (available.size < 2) continue;

    const allCx = Array.from(available.values()).map(c => c.center.x);
    const midlineX = allCx.reduce((a, b) => a + b, 0) / allCx.length;

    let maxOffset = 0,
      apexName = '',
      apexC: FrontalCorners | null = null,
      apexY = 0;
    for (const [name, c] of available.entries()) {
      const offset = Math.abs(c.center.x - midlineX);
      if (offset > maxOffset) {
        maxOffset = offset;
        apexName = name;
        apexC = c;
        apexY = c.center.y;
      }
    }
    if (!apexC || usedApex.has(apexName)) continue;

    const apex = apexC;
    const apexTilt = calcAngle(apex.topLeft, apex.topRight);

    let maxTilt = apexTilt,
      upperName = '',
      upperC: FrontalCorners | null = null;
    let topmostName = '',
      topmostC: FrontalCorners | null = null,
      topmostY = Infinity;
    for (const [name, c] of available.entries()) {
      if (c.center.y < apexY - 10) {
        const tilt = calcAngle(c.topLeft, c.topRight);
        if (tilt > maxTilt) {
          maxTilt = tilt;
          upperName = name;
          upperC = c;
        }
        if (c.center.y < topmostY) {
          topmostY = c.center.y;
          topmostName = name;
          topmostC = c;
        }
      }
    }
    if (!upperC && topmostC) {
      upperC = topmostC;
      upperName = topmostName;
    }
    if (!upperC) {
      upperC = apex;
      upperName = apexName;
    }

    let minTilt = apexTilt,
      lowerName = '',
      lowerC: FrontalCorners | null = null;
    let bottomName = '',
      bottomC: FrontalCorners | null = null,
      bottomY = -Infinity;
    for (const [name, c] of available.entries()) {
      if (c.center.y > apexY + 10) {
        const tilt = calcAngle(c.topLeft, c.topRight);
        if (tilt < minTilt) {
          minTilt = tilt;
          lowerName = name;
          lowerC = c;
        }
        if (c.center.y > bottomY) {
          bottomY = c.center.y;
          bottomName = name;
          bottomC = c;
        }
      }
    }
    if (!lowerC && bottomC) {
      lowerC = bottomC;
      lowerName = bottomName;
    }
    if (!lowerC) {
      lowerC = apex;
      lowerName = apexName;
    }

    if (!upperC || !lowerC || upperName === lowerName) continue;

    const cobb = cobbAngle(
      upperC.topLeft,
      upperC.topRight,
      lowerC.bottomLeft,
      lowerC.bottomRight
    );
    if (Math.abs(cobb) > 10) {
      results.push({
        id: `vertebrae-derived-cobb-${region.name.toLowerCase()}`,
        type: `Cobb-${region.name}`,
        value: '',
        points: [
          upperC.topLeft,
          upperC.topRight,
          lowerC.bottomLeft,
          lowerC.bottomRight,
        ],
        description: `[推导] Cobb ${region.name}（上=${upperName}, 下=${lowerName}, 顶=${apexName}）`,
        upperVertebra: upperName,
        lowerVertebra: lowerName,
        apexVertebra: apexName,
      });
      usedApex.add(apexName);
    }
  }
  return results;
}

function deriveAnterior(
  vertebraeLayer: VertebraAnnotation[]
): MeasurementData[] {
  const frontal = new Map<string, FrontalCorners>();
  const pose = new Map<string, Point>();

  vertebraeLayer.forEach(v => {
    if (VERTEBRA_LABELS.has(v.label)) {
      frontal.set(v.label, buildFrontalCorners(v));
    } else if (POSE_LABELS.has(v.label)) {
      pose.set(v.label, v.corners[0]);
    }
  });

  const out: MeasurementData[] = [];

  if (frontal.has('T1')) {
    const t1 = frontal.get('T1')!;
    out.push(makeMeasurement('T1 Tilt', [t1.topLeft, t1.topRight]));
  }

  out.push(...findCobbAngles(frontal));

  if (pose.has('CR') && pose.has('CL'))
    out.push(makeMeasurement('CA', [pose.get('CR')!, pose.get('CL')!]));
  if (pose.has('IR') && pose.has('IL'))
    out.push(makeMeasurement('Pelvic', [pose.get('IR')!, pose.get('IL')!]));
  if (pose.has('SR') && pose.has('SL'))
    out.push(makeMeasurement('Sacral', [pose.get('SR')!, pose.get('SL')!]));

  const csvlX =
    pose.has('SR') && pose.has('SL')
      ? (pose.get('SR')!.x + pose.get('SL')!.x) / 2
      : null;

  if (csvlX !== null) {
    if (frontal.has('C7') && pose.has('SR') && pose.has('SL')) {
      // 6点格式与手动 TS 一致：[tl, tr, bl, br, sacralR, sacralL]
      // renderC7Offset 会绘制 C7 锥体框（4角连线）+ 骶骨参考线，检测层隐藏时也能正常渲染。
      const c7 = frontal.get('C7')!;
      const sr = pose.get('SR')!;
      const sl = pose.get('SL')!;
      out.push(makeMeasurement('TS', [
        c7.topLeft, c7.topRight, c7.bottomLeft, c7.bottomRight, sr, sl,
      ]));
    }
  }

  return out;
}

// ─── 统一入口 ────────────────────────────────────────────────────────────────

/**
 * 根据 vertebraeLayer 推导测量数据。
 * 替换 measurements[] 中所有 id 以 "vertebrae-derived-" 开头的条目。
 */
export function deriveAllMeasurements(
  vertebraeLayer: VertebraAnnotation[],
  cfhAnnotation: CfhAnnotation | null,
  examType: string
): MeasurementData[] {
  if (vertebraeLayer.length === 0) return [];
  try {
    if (examType === '侧位X光片') {
      return deriveLateral(vertebraeLayer, cfhAnnotation);
    } else {
      return deriveAnterior(
        keypointsToDerivedLayer(
          vertebraeLayerToKeypoints(vertebraeLayer, '正位X光片'),
          '正位X光片'
        )
      );
    }
  } catch (e) {
    console.error('[vertebrae-derive] 推导失败:', e);
    return [];
  }
}

export const DERIVED_ID_PREFIX = 'vertebrae-derived-';
