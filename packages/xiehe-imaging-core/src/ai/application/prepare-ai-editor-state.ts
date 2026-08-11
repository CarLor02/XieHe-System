import { isBendingExamType } from '../../shared/domain/anatomy';
import type {
  CfhAnnotation,
  ImageSize,
  MeasurementData,
  VertebraAnnotation,
} from '../../shared/domain/contracts';
import {
  type KeypointAnnotation,
  vertebraeLayerToKeypoints,
} from '../../keypoints/domain';
import type {
  AiMeasurementResponse,
  NormalizeAiMeasurementsOptions,
} from '../domain';
import {
  filterBendingAiVertebraeLayer,
  normalizeAiMeasurements,
} from '../domain';

export interface PreparedAiEditorState {
  measurements: MeasurementData[];
  vertebraeLayer: VertebraAnnotation[];
  keypoints: KeypointAnnotation[];
  cfhAnnotation: CfhAnnotation | null;
  showVertebraeLayer: boolean;
  imageSize: ImageSize | null;
}

/** 将 AI 协议响应归一化为编辑器可一次性替换的跨端快照。 */
export function prepareAiEditorState(input: {
  response: AiMeasurementResponse;
  examType: string;
  actualImageSize: ImageSize | null;
  resolveTool: NormalizeAiMeasurementsOptions['resolveTool'];
  calculateValue: NormalizeAiMeasurementsOptions['calculateValue'];
  describeType: NormalizeAiMeasurementsOptions['describeType'];
  createId: NormalizeAiMeasurementsOptions['createId'];
}): PreparedAiEditorState {
  const normalized = normalizeAiMeasurements(input);
  const isBendingView = isBendingExamType(input.examType);
  const responseLayer = Array.isArray(input.response.vertebrae)
    ? input.response.vertebrae
    : [];
  const vertebraeLayer = isBendingView
    ? filterBendingAiVertebraeLayer(responseLayer)
    : responseLayer;
  const cfhAnnotation = isBendingView ? null : (input.response.cfh ?? null);

  return {
    measurements: normalized.measurements,
    vertebraeLayer,
    keypoints: vertebraeLayerToKeypoints(
      vertebraeLayer,
      input.examType,
      cfhAnnotation
    ),
    cfhAnnotation,
    showVertebraeLayer: vertebraeLayer.length > 0,
    imageSize: input.actualImageSize ?? normalized.sourceImageSize,
  };
}
