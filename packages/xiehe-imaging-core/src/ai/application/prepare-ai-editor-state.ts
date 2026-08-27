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
import { resolveCobbEndpointPointIds } from '../../measurements/domain';
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

function bindAiCobbMeasurements(
  measurements: MeasurementData[],
  keypoints: KeypointAnnotation[],
  examType: string
): MeasurementData[] {
  const keypointsById = new Map(
    keypoints.map(keypoint => [keypoint.id, keypoint.point])
  );

  return measurements.map(measurement => {
    if (!measurement.upperVertebra || !measurement.lowerVertebra) {
      return measurement;
    }

    const endpointIds = resolveCobbEndpointPointIds(measurement, { examType });
    if (!endpointIds) return measurement;

    const [first, second, third, fourth] = endpointIds.map(pointId =>
      keypointsById.get(pointId)
    );
    if (!first || !second || !third || !fourth) return measurement;

    // AI Cobb 已给出确定端椎时，四个端板点就是后续拖动和重算的稳定绑定契约。
    // 保留模型返回的 id、编号和 value，只用检测层坐标建立正式双向绑定。
    return {
      ...measurement,
      points: [first, second, third, fourth],
      keypointSynced: true,
    };
  });
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
  const keypoints = vertebraeLayerToKeypoints(
    vertebraeLayer,
    input.examType,
    cfhAnnotation
  );

  return {
    measurements: bindAiCobbMeasurements(
      normalized.measurements,
      keypoints,
      input.examType
    ),
    vertebraeLayer,
    keypoints,
    cfhAnnotation,
    showVertebraeLayer: vertebraeLayer.length > 0,
    imageSize: input.actualImageSize ?? normalized.sourceImageSize,
  };
}
