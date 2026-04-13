export interface AiMeasurementPoint {
  x: number;
  y: number;
}

export interface AiParsedNumericValue {
  source: string;
  parsedValue: number;
}

export interface AiPredictedMeasurement {
  type: string;
  points: AiMeasurementPoint[];
  angle?: number | AiParsedNumericValue;
  upper_vertebra?: string;
  lower_vertebra?: string;
  apex_vertebra?: string;
}

export interface PredictMeasurementsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  measurements: AiPredictedMeasurement[];
}

function getAiMeasurementUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_URL || '';
  if (!url) {
    throw new Error(
      'AI测量接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_URL'
    );
  }
  return url;
}

export async function predictAiMeasurements(
  file: File | Blob,
  options: {
    filename?: string;
    imageId?: string;
  } = {}
): Promise<PredictMeasurementsResponse> {
  const formData = new FormData();
  formData.append('file', file, options.filename || 'image.png');
  if (options.imageId) {
    formData.append('image_id', options.imageId);
  }

  const response = await fetch(getAiMeasurementUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI测量失败: ${response.status}`);
  }

  return response.json() as Promise<PredictMeasurementsResponse>;
}
