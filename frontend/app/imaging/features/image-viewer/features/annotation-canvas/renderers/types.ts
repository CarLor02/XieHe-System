import { MeasurementData, Point } from '@/app/imaging/features/image-viewer/shared/types';

export interface MeasurementRendererProps {
  measurement: MeasurementData;
  screenPoints: Point[];
  displayColor: string;
  imageScale: number;
}

