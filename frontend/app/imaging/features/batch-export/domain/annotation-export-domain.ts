import type { VertebraAnnotation } from '@xiehe/imaging-core/contracts';
import { buildTrainingLabelPayload } from '@xiehe/imaging-core/exports';
import type { ImageFile } from '@xiehe/api-contracts';

/** Blob 创建属于 Web 平台，训练标签 payload 由 imaging-core 维护。 */
export function buildTrainingLabelBlob(
  image: ImageFile,
  vertebraeLayer: VertebraAnnotation[],
  imageWidth: number,
  imageHeight: number
): Blob {
  const payload = buildTrainingLabelPayload(
    image,
    vertebraeLayer,
    imageWidth,
    imageHeight
  );
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}
