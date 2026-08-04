const BENDING_EXAM_TYPES = new Set(['左侧曲位', '右侧曲位']);

/** 标准正位检查；需要排除曲位的业务规则应使用此判断。 */
export function isAnteriorExamType(examType: string): boolean {
  return examType === '正位X光片';
}

export function isBendingExamType(examType: string): boolean {
  return BENDING_EXAM_TYPES.has(examType);
}

/** 正位投影包含标准正位和左右侧曲位，共享椎体四角与 AP Cobb 几何规则。 */
export function isApProjectionExamType(examType: string): boolean {
  return isAnteriorExamType(examType) || isBendingExamType(examType);
}

export function isLateralExamType(examType: string): boolean {
  return examType === '侧位X光片';
}

export function isKeypointSupportedExamType(examType: string): boolean {
  return isApProjectionExamType(examType) || isLateralExamType(examType);
}
