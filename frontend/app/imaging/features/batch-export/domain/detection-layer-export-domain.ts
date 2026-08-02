import {
  type CfhAnnotation,
  type KeypointAnnotation,
  type VertebraAnnotation,
  vertebraeLayerToKeypoints,
} from '@/app/imaging/features/image-viewer/public';

/**
 * 将持久化检测层转换为导出用逻辑关键点。
 *
 * 复用查看器的关键点映射规则，以同时兼容完整椎体四角记录和历史单点记录；
 * 返回坐标始终为标注 JSON 中的原图像素坐标，不做归一化或缩放。
 */
export function getDetectionLayerKeypoints({
  vertebraeLayer,
  cfhAnnotation,
  examType,
}: {
  vertebraeLayer: VertebraAnnotation[];
  cfhAnnotation?: CfhAnnotation | null;
  examType: string;
}): KeypointAnnotation[] {
  return vertebraeLayerToKeypoints(
    vertebraeLayer,
    examType,
    cfhAnnotation ?? null
  );
}
