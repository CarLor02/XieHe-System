/** 编号越小代表生理学位置越靠上。 */
export const MEASUREMENT_DERIVE_VERTEBRA_ORDER = [
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
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
  'S1',
] as const;

export type VertebraLabel = (typeof MEASUREMENT_DERIVE_VERTEBRA_ORDER)[number];

const vertebraOrderByLabel: ReadonlyMap<string, number> = new Map(
  MEASUREMENT_DERIVE_VERTEBRA_ORDER.map((label, index) => [label, index + 1])
);

export function getMeasurementDeriveVertebraOrder(
  vertebra: string
): number | null {
  return vertebraOrderByLabel.get(vertebra) ?? null;
}
