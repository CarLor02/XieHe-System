export interface AiParsedConfidence {
  source: string;
  parsedValue: number;
}

export interface AiPoseKeypoint {
  x: number;
  y: number;
  confidence?: AiParsedConfidence | number | null;
}

export interface AiVertebraCorner {
  x: number;
  y: number;
  conf?: number;
}

export interface AiVertebraCorners {
  top_left: AiVertebraCorner;
  top_right: AiVertebraCorner;
  bottom_right: AiVertebraCorner;
  bottom_left: AiVertebraCorner;
  top_mid?: { x: number; y: number };
  bottom_mid?: { x: number; y: number };
  center?: { x: number; y: number };
}

export interface AiVertebraDetection {
  corners: AiVertebraCorners;
  confidence?: number;
  class_id?: number;
}

export interface DetectKeypointsResponse {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  pose_keypoints: Record<string, AiPoseKeypoint>;
  vertebrae: Record<string, AiVertebraDetection>;
}

function getAiAnnotationUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL || '';
  if (!url) {
    throw new Error(
      'AI关键点检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_KEYPOINTS_URL'
    );
  }
  return url;
}

export async function detectAiKeypoints(
  file: File | Blob,
  filename = 'image.png'
): Promise<DetectKeypointsResponse> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const response = await fetch(getAiAnnotationUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI关键点检测失败: ${response.status}`);
  }

  return response.json() as Promise<DetectKeypointsResponse>;
}
