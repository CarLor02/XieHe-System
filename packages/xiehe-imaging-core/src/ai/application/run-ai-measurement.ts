import type { AiMeasurementResponse, NormalizeAiMeasurementsOptions } from '../domain';
import type { ImageSize } from '../../shared/domain/contracts';
import {
  prepareAiEditorState,
  type PreparedAiEditorState,
} from './prepare-ai-editor-state';

export interface AiMeasurementPort<TImageId> {
  measure(imageId: TImageId, examType: string): Promise<AiMeasurementResponse>;
}

export type AiMeasurementWorkflowResult =
  | { status: 'empty' }
  | { status: 'ready'; state: PreparedAiEditorState };

export async function runAiMeasurement<TImageId>(input: {
  imageId: TImageId;
  examType: string;
  actualImageSize: ImageSize | null;
  port: AiMeasurementPort<TImageId>;
  resolveTool: NormalizeAiMeasurementsOptions['resolveTool'];
  calculateValue: NormalizeAiMeasurementsOptions['calculateValue'];
  describeType: NormalizeAiMeasurementsOptions['describeType'];
  createId: NormalizeAiMeasurementsOptions['createId'];
}): Promise<AiMeasurementWorkflowResult> {
  const response = await input.port.measure(input.imageId, input.examType);
  if (!Array.isArray(response.measurements)) return { status: 'empty' };
  return {
    status: 'ready',
    state: prepareAiEditorState({
      response,
      examType: input.examType,
      actualImageSize: input.actualImageSize,
      resolveTool: input.resolveTool,
      calculateValue: input.calculateValue,
      describeType: input.describeType,
      createId: input.createId,
    }),
  };
}
