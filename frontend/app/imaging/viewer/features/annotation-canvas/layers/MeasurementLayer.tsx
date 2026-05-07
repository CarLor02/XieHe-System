import type { JSX } from 'react';
import { MeasurementData } from '@/app/imaging/viewer/shared/types';

export interface MeasurementLayerProps {
  measurements: MeasurementData[];
  renderMeasurement: (measurement: MeasurementData, index: number, allMeasurements: MeasurementData[]) => JSX.Element | null;
}

export default function MeasurementLayer({
  measurements,
  renderMeasurement,
}: MeasurementLayerProps) {
  return (
    <>
      {measurements.map((measurement, index) => renderMeasurement(measurement, index, measurements))}
    </>
  );
}
