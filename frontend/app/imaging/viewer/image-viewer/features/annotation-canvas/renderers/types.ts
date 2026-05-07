import { MeasurementData, Point } from '@/app/imaging/viewer/image-viewer/shared/types';

export interface MeasurementRendererProps {
  measurement: MeasurementData;
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
}

