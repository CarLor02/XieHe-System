import { Measurement, Point } from '../../../types';

export interface MeasurementRendererProps {
  measurement: Measurement;
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
}

