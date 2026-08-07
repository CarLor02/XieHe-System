import type { CircleGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/circle';
import type { Point } from '@/app/imaging/features/image-viewer/shared/types';

export type FemoralHeadMode = 'single' | 'bilateral';

export interface PelvicMeasurementMetadata {
  schemaVersion: 2;
  femoralHeadMode: FemoralHeadMode;
}

export type EffectiveCfhResolution =
  | {
      status: 'ready';
      mode: FemoralHeadMode;
      point: Point;
      dependencyIds: readonly string[];
    }
  | {
      status: 'missing';
      mode: FemoralHeadMode | null;
      missingKeypointIds: readonly string[];
    }
  | {
      status: 'conflict';
    };

export interface PelvicMeasurementGeometry {
  mode: FemoralHeadMode | 'sacral-only';
  femoralHeadCenter: Point | null;
  femoralHeadCircles: readonly CircleGeometry[];
  sacralLeft: Point;
  sacralRight: Point;
  sacralMidpoint: Point;
  sacralNormal: Point;
}

export interface PelvicPlacementSession {
  toolId: 'pi' | 'pt';
  mode: FemoralHeadMode;
}
