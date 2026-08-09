import type { CircleGeometry } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/shared/circle';
import type {
  FemoralHeadMode,
  PelvicToolId,
  Point,
} from '@xiehe/imaging-core/contracts';

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
  toolId: PelvicToolId;
  mode: FemoralHeadMode;
}
