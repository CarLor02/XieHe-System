import { Measurement } from '../../../types';

interface MeasurementLayerProps {
  measurements: Measurement[];
  renderMeasurement: (measurement: Measurement) => React.ReactNode;
}

export default function MeasurementLayer({
  measurements,
  renderMeasurement,
}: MeasurementLayerProps) {
  return <>{measurements.map(renderMeasurement)}</>;
}

