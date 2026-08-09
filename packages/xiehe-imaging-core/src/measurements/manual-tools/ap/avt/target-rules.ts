import {
  getMeasurementDeriveVertebraOrder,
  MEASUREMENT_DERIVE_VERTEBRA_ORDER,
} from '../../../../anatomy';
import type {
  AvtMetadata,
  AvtReferenceLine,
  AvtTarget,
} from '../../../../contracts';

const AVT_FIRST_VERTEBRA = 'T2';
const AVT_C7PL_LAST_VERTEBRA = 'T11';
const AVT_LAST_VERTEBRA = 'L4';

function getRequiredOrder(label: string): number {
  const order = getMeasurementDeriveVertebraOrder(label);
  if (order === null) {
    throw new Error(`Unknown AVT vertebra label: ${label}`);
  }
  return order;
}

const AVT_FIRST_ORDER = getRequiredOrder(AVT_FIRST_VERTEBRA);
const AVT_C7PL_LAST_ORDER = getRequiredOrder(AVT_C7PL_LAST_VERTEBRA);
const AVT_LAST_ORDER = getRequiredOrder(AVT_LAST_VERTEBRA);

export const AVT_VERTEBRA_TARGETS = MEASUREMENT_DERIVE_VERTEBRA_ORDER.filter(
  label => {
    const order = getRequiredOrder(label);
    return order >= AVT_FIRST_ORDER && order <= AVT_LAST_ORDER;
  }
);

export const AVT_DISC_TARGETS: Extract<AvtTarget, { type: 'disc' }>[] =
  AVT_VERTEBRA_TARGETS.slice(0, -1).map((upperVertebra, index) => ({
    type: 'disc',
    upperVertebra,
    lowerVertebra: AVT_VERTEBRA_TARGETS[index + 1],
  }));

function isAvtTarget(value: unknown): value is AvtTarget {
  if (!value || typeof value !== 'object') return false;
  const target = value as Partial<AvtTarget>;
  if (target.type === 'vertebra') {
    return (
      typeof target.vertebra === 'string' &&
      AVT_VERTEBRA_TARGETS.includes(
        target.vertebra as (typeof AVT_VERTEBRA_TARGETS)[number]
      )
    );
  }
  if (target.type === 'disc') {
    return (
      typeof target.upperVertebra === 'string' &&
      typeof target.lowerVertebra === 'string' &&
      AVT_DISC_TARGETS.some(
        candidate =>
          candidate.upperVertebra === target.upperVertebra &&
          candidate.lowerVertebra === target.lowerVertebra
      )
    );
  }
  return false;
}

export function isAvtMetadata(value: unknown): value is AvtMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<AvtMetadata>;
  return (
    metadata.schemaVersion === 2 &&
    (metadata.referenceLine === 'c7pl' || metadata.referenceLine === 'csvl') &&
    isAvtTarget(metadata.target)
  );
}

export function getAvtTargetLabel(target: AvtTarget): string {
  return target.type === 'vertebra'
    ? target.vertebra
    : `${target.upperVertebra}-${target.lowerVertebra}`;
}

export function getAvtTargetKey(target: AvtTarget): string {
  return target.type === 'vertebra'
    ? `vertebra:${target.vertebra}`
    : `disc:${target.upperVertebra}:${target.lowerVertebra}`;
}

export function getAvtMeasurementId(target: AvtTarget): string {
  const normalizedLabel = getAvtTargetLabel(target).toLowerCase();
  return target.type === 'vertebra'
    ? `ap-keypoint-avt-${normalizedLabel}`
    : `ap-keypoint-avt-disc-${normalizedLabel}`;
}

export function getAvtReferenceLine(target: AvtTarget): AvtReferenceLine {
  const comparisonLabel =
    target.type === 'vertebra' ? target.vertebra : target.upperVertebra;
  return getRequiredOrder(comparisonLabel) <= AVT_C7PL_LAST_ORDER
    ? 'c7pl'
    : 'csvl';
}

export function createAvtMetadata(target: AvtTarget): AvtMetadata {
  return {
    schemaVersion: 2,
    target,
    referenceLine: getAvtReferenceLine(target),
  };
}
