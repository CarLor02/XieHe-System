import type { JSX } from 'react';
import { Measurement } from '../../../types';

export interface MeasurementLayerProps {
  measurements: Measurement[];
  renderMeasurement: (measurement: Measurement) => JSX.Element | null;
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
