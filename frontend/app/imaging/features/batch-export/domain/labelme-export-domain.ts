import type { LabelMePayload } from '@xiehe/imaging-core/exports';

/** LabelMe JSON 的生成规则在 imaging-core；Web 只负责创建下载 Blob。 */
export function buildLabelMeAnnotationBlob(payload: LabelMePayload): Blob {
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}
