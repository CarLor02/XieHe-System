import type { JSX } from 'react';
import { MeasurementData } from '../../../types';

export interface MeasurementLayerProps {
  measurements: MeasurementData[];
  renderMeasurement: (measurement: MeasurementData) => JSX.Element | null;
}

export default function MeasurementLayer({
  measurements,
  renderMeasurement,
}: MeasurementLayerProps) {
  return (
    <>
      {measurements.map(renderMeasurement)}
    </>
  );
}
