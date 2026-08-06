import {
  isAnteriorExamType,
  isBendingExamType,
  isLateralExamType,
} from '@/app/imaging/features/image-viewer/shared/domain/exam-type';

import type { MeasurementKeypointBindingRule } from '../binding-rule-types';
import {
  getAutoDeriveMeasurementKeypointBindingRules,
  getMeasurementKeypointBindingRule,
} from '../measurement-keypoint-binding';

function ruleMatchesExam(
  rule: MeasurementKeypointBindingRule,
  examType: string
): boolean {
  if (isBendingExamType(examType)) return false;
  return rule.examView === 'lateral'
    ? isLateralExamType(examType)
    : isAnteriorExamType(examType);
}

/**
 * 返回一个手动工具完成后允许局部派生的规则。
 *
 * 本次工具的完整绑定点集是严格边界：目标规则需要的每个关键点都必须
 * 包含在该边界内，不能借用图像中其他早已存在的关键点完成无关派生。
 */
export function getToolCompletionDerivationRules(
  completedToolType: string,
  examType: string
): MeasurementKeypointBindingRule[] {
  const sourceRule = getMeasurementKeypointBindingRule(completedToolType);
  if (!sourceRule || !ruleMatchesExam(sourceRule, examType)) return [];

  const candidateRules = getAutoDeriveMeasurementKeypointBindingRules(examType);
  if (candidateRules.length === 0) return [];

  const sourceKeypointIds = new Set(sourceRule.requiredKeypointIds);
  return candidateRules.filter(
    candidateRule =>
      candidateRule.typeId !== sourceRule.typeId &&
      candidateRule.requiredKeypointIds.every(keypointId =>
        sourceKeypointIds.has(keypointId)
      )
  );
}
