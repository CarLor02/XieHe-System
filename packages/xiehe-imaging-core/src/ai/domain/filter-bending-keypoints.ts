import {
  isApVertebraGroup,
  parseApVertebraKeypointId,
} from '../../keypoints/domain';
import type { VertebraAnnotation } from '../../shared/domain/contracts';

/** 曲位 AI 结果只保留可用于 AP Cobb 的椎体四角或单角点。 */
export function filterBendingAiVertebraeLayer(
  vertebraeLayer: VertebraAnnotation[]
): VertebraAnnotation[] {
  return vertebraeLayer.filter(
    annotation =>
      isApVertebraGroup(annotation.label) ||
      parseApVertebraKeypointId(annotation.label) !== null
  );
}
