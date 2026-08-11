import {
  createEmptyBindings,
  migrateAnnotationBindings,
  type AnnotationBindings,
} from '../../../bindings/domain';
import { decodeAnnotationDocument } from '../../../annotation-document/domain/annotation-document-codec';
import { hydratePersistedKeypointState } from '../../../measurement-keypoint-sync/application/hydratePersistedKeypointStateUseCase';
import { STANDARD_DISTANCE_DEFAULTS } from '../../../measurements/domain/calibration';
import type {
  CfhAnnotation,
  MeasurementData,
  Point,
  VertebraAnnotation,
} from '../../../shared/domain/contracts';
import type { HydratedKeypointState } from '../../../measurement-keypoint-sync/application/hydratePersistedKeypointStateUseCase';

export interface StudyEditorSource {
  id: number;
  file_uuid: string;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_identifier?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  study_date?: string | null;
  description?: string | null;
  file_type: string;
  status: string;
  created_at: string;
  annotation: unknown | null;
  annotation_version: number;
}

export interface StudyEditorData {
  id: number;
  study_id: string;
  patient_id: number;
  patient_name: string;
  patient_identifier: string | null;
  patient_gender: string | null;
  patient_age: number | null;
  study_date: string;
  study_description: string;
  modality: string;
  status: string;
  created_at: string;
}

export interface PreparedStudyEditorState {
  study: StudyEditorData;
  annotationVersion: number;
  measurements: MeasurementData[];
  standardDistance: number | null;
  standardDistancePoints: Point[];
  pointBindings: AnnotationBindings;
  reportText: string;
  keypointState: HydratedKeypointState;
}

function cloneDefaultStandardDistancePoints(): Point[] {
  return STANDARD_DISTANCE_DEFAULTS.points.map(point => ({ ...point }));
}

/**
 * 将服务端影像详情原子地水合为编辑器状态。
 *
 * 服务器是标注的唯一事实源。无 annotation 时使用默认标尺；存在但无法解码
 * 的 annotation 必须抛错，调用端不得回退到浏览器旧副本或伪造 study。
 */
export function prepareStudyEditorState(input: {
  source: StudyEditorSource;
  normalizeMeasurementType: (type: string) => string;
}): PreparedStudyEditorState {
  const { source } = input;
  const studyDescription = source.description?.trim() || source.file_type;
  const study: StudyEditorData = {
    id: source.id,
    study_id: source.file_uuid,
    patient_id: source.patient_id ?? 0,
    patient_name: source.patient_name?.trim() ?? '',
    patient_identifier: source.patient_identifier ?? null,
    patient_gender: source.patient_gender ?? null,
    patient_age: source.patient_age ?? null,
    study_date: source.study_date || source.created_at,
    study_description: studyDescription,
    modality: source.file_type,
    status: source.status,
    created_at: source.created_at,
  };

  if (source.annotation === null) {
    const keypointState = hydratePersistedKeypointState({
      examType: studyDescription,
      measurements: [],
      vertebraeLayer: [],
      cfhAnnotation: null,
    });
    return {
      study,
      annotationVersion: source.annotation_version,
      measurements: [],
      standardDistance: STANDARD_DISTANCE_DEFAULTS.distance,
      standardDistancePoints: cloneDefaultStandardDistancePoints(),
      pointBindings: createEmptyBindings(),
      reportText: '',
      keypointState,
    };
  }

  const annotationDocument = decodeAnnotationDocument(source.annotation);
  if (!annotationDocument) {
    throw new Error('不支持的标注文档版本或标注数据格式无效');
  }

  const measurements = annotationDocument.measurements.map(measurement => ({
    ...measurement,
    type: input.normalizeMeasurementType(measurement.type),
  }));
  const vertebraeLayer: VertebraAnnotation[] =
    annotationDocument.vertebraeLayer ?? [];
  const cfhAnnotation: CfhAnnotation | null =
    annotationDocument.cfhAnnotation ?? null;
  const hasStoredStandardDistance =
    annotationDocument.standardDistance !== null &&
    annotationDocument.standardDistancePoints?.length === 2;

  return {
    study,
    annotationVersion: source.annotation_version,
    measurements,
    standardDistance: hasStoredStandardDistance
      ? annotationDocument.standardDistance
      : STANDARD_DISTANCE_DEFAULTS.distance,
    standardDistancePoints: hasStoredStandardDistance
      ? annotationDocument.standardDistancePoints!.map(point => ({ ...point }))
      : cloneDefaultStandardDistancePoints(),
    pointBindings: migrateAnnotationBindings(
      annotationDocument.pointBindings,
      measurements
    ),
    reportText: annotationDocument.reportText ?? '',
    keypointState: hydratePersistedKeypointState({
      examType: studyDescription,
      measurements,
      vertebraeLayer,
      cfhAnnotation,
    }),
  };
}
