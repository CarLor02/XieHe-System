import { parseApVertebraKeypointId } from '../catalog/ap/keypoints';
import {
  parseLateralSacralKeypointId,
  parseLateralVertebraKeypointId,
} from '../catalog/lateral/keypoints';
import { getAnnotationTypeId } from '../catalog/shared/annotation-config';
import { MeasurementData, Point } from '../types';
import { KeypointAnnotation } from './keypoint-state';

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

  return Array.from(selected).sort((left, right) => left.localeCompare(right));
}
