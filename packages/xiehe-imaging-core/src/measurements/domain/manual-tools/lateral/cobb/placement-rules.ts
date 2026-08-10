import type { Point } from '../../../../../shared/domain/contracts';

import { getGenericLateralCobbEndpointPointIds } from './endpoint-rules';

export interface LateralCobbPlacementSession {
  toolId: 'lateral-cobb';
  upperVertebra: string | null;
  lowerVertebra: string | null;
}

export type LateralCobbPlacementPointIds = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
];

export const LATERAL_COBB_PLACEMENT_POINT_COUNT = 4;

function normalizeVertebra(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized || null;
}

/**
 * 手动侧位 Cobb 的四个槽位始终是上端板两点、下端板两点。
 * 端椎待定时，对应槽位只属于 measurement，不提前绑定到检测层关键点。
 */
export function getLateralCobbPlacementPointIds(
  session: Pick<LateralCobbPlacementSession, 'upperVertebra' | 'lowerVertebra'>
): LateralCobbPlacementPointIds {
  const upper = normalizeVertebra(session.upperVertebra);
  const lower = normalizeVertebra(session.lowerVertebra);
  const upperPointIds = upper
    ? getGenericLateralCobbEndpointPointIds(upper, 'upper')
    : [null, null];
  const lowerPointIds = lower
    ? getGenericLateralCobbEndpointPointIds(lower, 'lower')
    : [null, null];
  return [
    upperPointIds[0],
    upperPointIds[1],
    lowerPointIds[0],
    lowerPointIds[1],
  ];
}

export function getLateralCobbPlacementPointLabels(
  session: Pick<LateralCobbPlacementSession, 'upperVertebra' | 'lowerVertebra'>
): readonly [string, string, string, string] {
  const pointIds = getLateralCobbPlacementPointIds(session);
  return [
    pointIds[0] ?? '上端椎点1',
    pointIds[1] ?? '上端椎点2',
    pointIds[2] ?? '下端椎点1',
    pointIds[3] ?? '下端椎点2',
  ];
}

export function assembleLateralCobbPlacementPoints(
  inherited: ReadonlyMap<number, Point>,
  clickedPoints: readonly Point[]
): Point[] | null {
  const points: Point[] = [];
  let clickedIndex = 0;
  for (
    let pointIndex = 0;
    pointIndex < LATERAL_COBB_PLACEMENT_POINT_COUNT;
    pointIndex += 1
  ) {
    const point = inherited.get(pointIndex) ?? clickedPoints[clickedIndex++];
    if (!point) return null;
    points.push({ ...point });
  }
  return points;
}
