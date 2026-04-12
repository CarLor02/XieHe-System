import type { ReactNode } from 'react';
import { Measurement } from '../../../types';

export interface MeasurementLayerProps {
  measurements: Measurement[];
  renderMeasurement: (measurement: Measurement) => ReactNode;
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
