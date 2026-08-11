import type { AnnotationBindings } from '../../bindings/domain';
import type { KeypointAnnotation } from '../../keypoints/domain';
import type {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '../../shared/domain/contracts';

/**
 * 可以撤回和重做的标注事实快照。
 *
 * 选择、悬浮、检测层开关、缩放和平移均属于平台交互状态，不得写入该快照。
 */
export interface AnnotationEditorSnapshot {
  measurements: MeasurementData[];
  standardDistance: number | null;
  standardDistanceValue: string;
  standardDistancePoints: Point[];
  pointBindings: AnnotationBindings;
  keypoints: KeypointAnnotation[];
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  aiMeasurementIds: string[];
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y };
}

function cloneMeasurement(measurement: MeasurementData): MeasurementData {
  return {
    ...measurement,
    points: measurement.points.map(clonePoint),
    avtMetadata: measurement.avtMetadata
      ? {
          ...measurement.avtMetadata,
          target: { ...measurement.avtMetadata.target },
        }
      : undefined,
    pelvicMetadata: measurement.pelvicMetadata
      ? { ...measurement.pelvicMetadata }
      : undefined,
  };
}

/** 对已知标注结构显式深拷贝，避免 JSON 克隆丢失未来新增的可选值语义。 */
export function cloneAnnotationEditorSnapshot(
  snapshot: AnnotationEditorSnapshot
): AnnotationEditorSnapshot {
  return {
    measurements: snapshot.measurements.map(cloneMeasurement),
    standardDistance: snapshot.standardDistance,
    standardDistanceValue: snapshot.standardDistanceValue,
    standardDistancePoints: snapshot.standardDistancePoints.map(clonePoint),
    pointBindings: {
      schemaVersion: snapshot.pointBindings.schemaVersion,
      syncGroups: snapshot.pointBindings.syncGroups.map(group => ({
        ...group,
        members: group.members.map(member => ({ ...member })),
      })),
    },
    keypoints: snapshot.keypoints.map(keypoint => ({
      ...keypoint,
      point: clonePoint(keypoint.point),
    })),
    vertebraeLayer: snapshot.vertebraeLayer.map(vertebra => ({
      ...vertebra,
      corners: vertebra.corners.map(clonePoint) as [Point, Point, Point, Point],
    })),
    cfhAnnotation: snapshot.cfhAnnotation
      ? {
          ...snapshot.cfhAnnotation,
          center: clonePoint(snapshot.cfhAnnotation.center),
        }
      : null,
    aiMeasurementIds: [...snapshot.aiMeasurementIds],
  };
}

/** 快照只包含 JSON 兼容的持久化值，序列化比较可稳定覆盖全部嵌套字段。 */
export function areAnnotationEditorSnapshotsEqual(
  left: AnnotationEditorSnapshot,
  right: AnnotationEditorSnapshot
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
