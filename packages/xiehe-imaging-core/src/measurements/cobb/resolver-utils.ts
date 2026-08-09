import type { MeasurementData, Point } from '../../contracts';

import type {
  CobbEndpointPointIds,
  CobbPointTuple,
  ResolvedCobbMeasurement,
} from './resolver-types';

export function normalizeCobbVertebra(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? '';
  return normalized || null;
}

export function getCobbPointTuple(
  points: readonly Point[]
): CobbPointTuple | null {
  if (points.length !== 4) return null;
  return [points[0], points[1], points[2], points[3]];
}

export function buildResolvedCobbMeasurement({
  resolverId,
  measurement,
  examView,
  layout,
  endpointPointIds,
  displayName,
  upperVertebra = normalizeCobbVertebra(measurement.upperVertebra),
  lowerVertebra = normalizeCobbVertebra(measurement.lowerVertebra),
}: {
  resolverId: string;
  measurement: MeasurementData;
  examView: ResolvedCobbMeasurement['examView'];
  layout: ResolvedCobbMeasurement['layout'];
  endpointPointIds: CobbEndpointPointIds | null;
  displayName: string;
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
}): ResolvedCobbMeasurement | null {
  const points = getCobbPointTuple(measurement.points);
  if (!points) return null;
  if (upperVertebra && lowerVertebra && upperVertebra === lowerVertebra) {
    return null;
  }

  return {
    kind: 'cobb',
    resolverId,
    measurement,
    examView,
    layout,
    points,
    upperEndplate: [points[0], points[1]],
    lowerEndplate: [points[2], points[3]],
    upperVertebra,
    lowerVertebra,
    endpointPointIds,
    displayName,
    interactivePoints: points,
  };
}

export function buildCobbEndpointPointIds(
  upperVertebra: string | null,
  lowerVertebra: string | null
): CobbEndpointPointIds | null {
  if (!upperVertebra || !lowerVertebra || upperVertebra === lowerVertebra) {
    return null;
  }
  return [
    `${upperVertebra}-1`,
    `${upperVertebra}-2`,
    `${lowerVertebra}-3`,
    `${lowerVertebra}-4`,
  ];
}
