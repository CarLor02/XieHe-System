import { parseApVertebraKeypointId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/ap/keypoints';
import {
  parseLateralSacralKeypointId,
  parseLateralVertebraKeypointId,
} from '@/app/imaging/features/image-viewer/features/measurements/catalog/lateral/keypoints';
import { getAnnotationTypeId } from '@/app/imaging/features/image-viewer/features/measurements/catalog/shared/annotation-config';
import { MeasurementData, Point } from '@/app/imaging/features/image-viewer/shared/types';
import { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints/domain/keypoint-state';

const POINT_MATCH_TOLERANCE = 0.5;

function isNearPoint(left: Point, right: Point): boolean {
  return (
    Math.abs(left.x - right.x) <= POINT_MATCH_TOLERANCE &&
    Math.abs(left.y - right.y) <= POINT_MATCH_TOLERANCE
  );
}

function isNearX(left: number, right: number): boolean {
  return Math.abs(left - right) <= POINT_MATCH_TOLERANCE;
}

function getCentroid(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function getVertebraGroup(id: string): string | null {
  return (
    parseApVertebraKeypointId(id)?.group ??
    parseLateralVertebraKeypointId(id)?.group ??
    null
  );
}

function buildCompleteVertebraGroups(keypoints: KeypointAnnotation[]) {
  const groups = new Map<string, KeypointAnnotation[]>();

  for (const keypoint of keypoints) {
    const group = getVertebraGroup(keypoint.id);
    if (!group) continue;
    const list = groups.get(group) ?? [];
    list.push(keypoint);
    groups.set(group, list);
  }

  return new Map(
    Array.from(groups.entries())
      .map(
        ([group, list]) =>
          [
            group,
            list.sort((left, right) => left.id.localeCompare(right.id)),
          ] as const
      )
      .filter(([, list]) => list.length === 4)
  );
}

function addVertebraGroup(
  selected: Set<string>,
  groups: Map<string, KeypointAnnotation[]>,
  group: string | null | undefined
) {
  if (!group) return;
  const keypoints = groups.get(group);
  if (!keypoints) return;
  keypoints.forEach(keypoint => selected.add(keypoint.id));
}

function addSacralReferencePair(
  selected: Set<string>,
  byId: Map<string, KeypointAnnotation>
) {
  if (byId.has('SL')) selected.add('SL');
  if (byId.has('SR')) selected.add('SR');
}

export interface MeasurementPointDragTarget {
  keypointIds: string[];
}

function uniqueSorted(ids: Iterable<string>): string[] {
  return Array.from(new Set(ids)).sort((left, right) =>
    left.localeCompare(right)
  );
}

function findExactKeypoint(
  point: Point,
  keypoints: KeypointAnnotation[]
): KeypointAnnotation | null {
  return keypoints.find(keypoint => isNearPoint(point, keypoint.point)) ?? null;
}

function findVertebraGroupAtCenter(
  point: Point,
  groups: Map<string, KeypointAnnotation[]>
): KeypointAnnotation[] | null {
  for (const groupKeypoints of groups.values()) {
    const center = getCentroid(groupKeypoints.map(keypoint => keypoint.point));
    if (isNearPoint(point, center)) {
      return groupKeypoints;
    }
  }

  return null;
}

export function resolveMeasurementKeypointIds(
  measurement: MeasurementData,
  keypoints: KeypointAnnotation[]
): string[] {
  if (keypoints.length === 0) return [];

  const selected = new Set<string>();
  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const completeGroups = buildCompleteVertebraGroups(keypoints);

  for (const measurementPoint of measurement.points) {
    for (const keypoint of keypoints) {
      if (isNearPoint(measurementPoint, keypoint.point)) {
        selected.add(keypoint.id);
      }
    }

    for (const [group, groupKeypoints] of completeGroups) {
      const center = getCentroid(
        groupKeypoints.map(keypoint => keypoint.point)
      );
      if (isNearPoint(measurementPoint, center)) {
        addVertebraGroup(selected, completeGroups, group);
      }
    }
  }

  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'sva' && measurement.points[4] && byId.has('S1-2')) {
    selected.add('S1-2');
  }

  if (measurement.upperVertebra) {
    addVertebraGroup(selected, completeGroups, measurement.upperVertebra);
  }
  if (measurement.lowerVertebra) {
    addVertebraGroup(selected, completeGroups, measurement.lowerVertebra);
  }
  if (measurement.apexVertebra) {
    addVertebraGroup(selected, completeGroups, measurement.apexVertebra);
  }

  if (typeId === 'avt' || typeId === 'ts') {
    const sl = byId.get('SL');
    const sr = byId.get('SR');
    const midlineX = sl && sr ? (sl.point.x + sr.point.x) / 2 : null;
    if (
      midlineX !== null &&
      measurement.points.some(point => isNearX(point.x, midlineX))
    ) {
      addSacralReferencePair(selected, byId);
    }
  }

  if (typeId === 'sva') {
    const s1p2 = byId.get('S1-2');
    if (
      s1p2 &&
      measurement.points.some(point => isNearPoint(point, s1p2.point))
    ) {
      selected.add('S1-2');
    }
  }

  for (const keypointId of ['CFH', 'S1-1', 'S1-2']) {
    const keypoint = byId.get(keypointId);
    if (
      keypoint &&
      measurement.points.some(point => isNearPoint(point, keypoint.point))
    ) {
      selected.add(keypointId);
    }
  }

  for (const keypoint of keypoints) {
    const sacral = parseLateralSacralKeypointId(keypoint.id);
    if (
      sacral &&
      measurement.points.some(point => isNearPoint(point, keypoint.point))
    ) {
      selected.add(keypoint.id);
    }
  }

  return uniqueSorted(selected);
}

export function resolveMeasurementPointDragTarget(
  measurement: MeasurementData,
  pointIndex: number,
  keypoints: KeypointAnnotation[]
): MeasurementPointDragTarget | null {
  const point = measurement.points[pointIndex];
  if (!point || keypoints.length === 0) return null;

  const byId = new Map(keypoints.map(keypoint => [keypoint.id, keypoint]));
  const typeId = getAnnotationTypeId(measurement.type);

  if (typeId === 'sva' && pointIndex === 4 && byId.has('S1-2')) {
    return { keypointIds: ['S1-2'] };
  }

  const exact = findExactKeypoint(point, keypoints);
  if (exact) {
    return { keypointIds: [exact.id] };
  }

  const completeGroups = buildCompleteVertebraGroups(keypoints);
  const centerGroup = findVertebraGroupAtCenter(point, completeGroups);
  if (centerGroup) {
    return {
      keypointIds: uniqueSorted(centerGroup.map(keypoint => keypoint.id)),
    };
  }

  if (typeId === 'avt' || typeId === 'ts') {
    const sl = byId.get('SL');
    const sr = byId.get('SR');
    if (sl && sr) {
      const midlineX = (sl.point.x + sr.point.x) / 2;
      if (isNearX(point.x, midlineX)) {
        return { keypointIds: ['SL', 'SR'] };
      }
    }
  }

  return null;
}
