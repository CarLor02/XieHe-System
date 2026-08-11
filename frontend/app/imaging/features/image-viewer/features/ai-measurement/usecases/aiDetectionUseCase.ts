import type {
  AiFrontalKeypointResponse,
  AiLateralKeypointResponse,
} from '@xiehe/imaging-core/ai';
import { normalizeAiKeypointDetection } from '@xiehe/imaging-core/ai';
import type {
  CfhAnnotation,
  VertebraAnnotation,
} from '@xiehe/imaging-core/contracts';
import type { Dispatch, SetStateAction } from 'react';

import type { ImageData } from '@xiehe/imaging-core/editor';
import { createLogger } from '@/lib/logger';
import { getAiKeypointDetectionResponse } from '@/services/imageServices';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.ai.measurement.usecases.aiDetectionUseCase'
);

/**
 * 侧位椎体预检测只负责请求与降级；坐标缩放、置信度去重、S1 和 CFH
 * 解析均由 imaging-core 的纯规则负责。
 */
export async function detectLateralVertebrae(imageId: string): Promise<{
  vertebrae: VertebraAnnotation[];
  cfh: CfhAnnotation | null;
} | null> {
  try {
    const response = (await getAiKeypointDetectionResponse(
      imageId
    )) as AiLateralKeypointResponse;
    const result = normalizeAiKeypointDetection(response, '侧位X光片');
    return { vertebrae: result.vertebrae, cfh: result.cfh };
  } catch (error) {
    logger.warn('[detectLateralVertebrae] 检测失败，跳过推导补全:', error);
    return null;
  }
}

// AI 检测只替换检测层；React 状态和提示仍由 Web application 层负责。
export async function aiDetect(
  imageId: string,
  imageData: ImageData,
  setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>,
  setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>,
  setSaveMessage: (message: string) => void,
  setIsAIDetecting: (aiDetectingState: boolean) => void
): Promise<void> {
  setIsAIDetecting(true);
  setSaveMessage('');

  try {
    const response = await getAiKeypointDetectionResponse(imageId);
    logger.debug('AI检测返回数据:', response);
    const result = normalizeAiKeypointDetection(
      response as AiLateralKeypointResponse | AiFrontalKeypointResponse,
      imageData.examType,
      // 历史检测层把侧位 CFH 同时保存为独立 cfhAnnotation 与单点图层。
      // 在持久化格式完成统一前保留该行为，避免旧图层显示发生变化。
      { includeCfhVertebraAnnotation: true }
    );

    if (result.vertebrae.length > 0 || result.cfh) {
      setVertebraeLayer(result.vertebrae);
      setCfhAnnotation(result.cfh);
      setSaveMessage(
        `AI检测完成，检测到 ${result.vertebraCount} 个椎体（${result.pointCount} 个关键点）`
      );
    } else {
      setSaveMessage('AI检测完成，但未检测到椎体');
    }
    setTimeout(() => setSaveMessage(''), 3000);
  } catch (error) {
    logger.error('AI检测失败:', error);
    setSaveMessage('AI检测失败，请检查服务是否正常运行');
    setTimeout(() => setSaveMessage(''), 3000);
  } finally {
    setIsAIDetecting(false);
  }
}
