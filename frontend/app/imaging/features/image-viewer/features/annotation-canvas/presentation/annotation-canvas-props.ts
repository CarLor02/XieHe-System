import type {
  AnnotationBindings,
  PointRef,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';
import type {
  AvtPlacementSession,
} from '@xiehe/imaging-core/contracts';
import type { PelvicPlacementSession } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import type {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import type {
  ImageData,
  KeypointSequenceSession,
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';

/**
 * 画布 feature 对 image-viewer controller 暴露的稳定输入契约。
 * 内部 controller、view 和 renderer 状态不得反向泄漏到页面级调用方。
 */
export interface AnnotationCanvasProps {
  selectedImage: Pick<ImageData, 'examType'>;
  measurements: MeasurementData[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  onMeasurementAdd: (type: string, points: Point[]) => void;
  onMeasurementsUpdate: (measurements: MeasurementData[]) => void;
  onMeasurementUpdate?: (
    measurementId: string,
    updates: Partial<MeasurementData>
  ) => void;
  onMeasurementDelete?: (measurementId: string) => void;
  onClearAll: () => void;
  canUndoAnnotationHistory: boolean;
  onUndoAnnotationHistory: () => void;
  canRedoAnnotationHistory: boolean;
  onRedoAnnotationHistory: () => void;
  tools: Tool[];
  clickedPoints: Point[];
  setClickedPoints: (points: Point[]) => void;
  avtPlacementSession?: AvtPlacementSession | null;
  pelvicPlacementSession?: PelvicPlacementSession | null;
  onAvtKeypointPlacement?: (point: Point) => void;
  onAvtDiscPlacementComplete?: (anchors: readonly [Point, Point]) => void;
  imageId: string;
  isSettingStandardDistance: boolean;
  setIsSettingStandardDistance: (value: boolean) => void;
  standardDistancePoints: Point[];
  setStandardDistancePoints: (points: Point[]) => void;
  standardDistance: number | null;
  hoveredStandardPointIndex: number | null;
  setHoveredStandardPointIndex: (index: number | null) => void;
  draggingStandardPointIndex: number | null;
  setDraggingStandardPointIndex: (index: number | null) => void;
  recalculateAVTandTS: (distance?: number, points?: Point[]) => void;
  onImageSizeChange: (size: { width: number; height: number }) => void;
  onToolChange: (tool: string) => void;
  isImagePanLocked: boolean;
  pointBindings: AnnotationBindings;
  setPointBindings: (bindings: AnnotationBindings) => void;
  selectedBindingGroupId: string | null;
  centerOnPoint: Point | null;
  onCenterConsumed: () => void;
  onCanvasClick: () => void;
  isManualBindingMode: boolean;
  manualBindingSelectedPoints: PointRef[];
  onManualBindingPointToggle: (
    annotationId: string,
    pointIndex: number
  ) => void;
  vertebraeLayer?: VertebraAnnotation[];
  keypoints?: KeypointAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  showVertebraeLayer?: boolean;
  onVertebraeUpdate?: (updated: VertebraAnnotation[]) => void;
  onVertebraePreviewUpdate?: (updated: VertebraAnnotation[]) => void;
  onKeypointAdd?: (keypointId: string, point: Point) => void;
  keypointSequenceSession?: KeypointSequenceSession | null;
  onSequenceKeypointAdd?: (point: Point) => void;
  onKeypointDelete?: (keypointId: string) => void;
  onKeypointGroupDelete?: (vertebraLabel: string) => void;
  onMeasurementWriteback?: (
    measurementType: string,
    pointIndex: number | readonly number[],
    newPoint: Point,
    measurementId?: string,
    updatedPoints?: Point[],
    updatedMeasurements?: MeasurementData[]
  ) => boolean;
  onAnnotationDataDragStart?: () => void;
}
