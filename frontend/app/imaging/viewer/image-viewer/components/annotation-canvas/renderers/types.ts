import { MeasurementData, Point } from '../../../types';

export interface MeasurementRendererProps {
  measurement: MeasurementData;
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
}

