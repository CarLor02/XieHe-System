/** 当前只有正位、侧位 X 光片支持结构化关键点。 */
export function isAnteriorExamType(examType: string): boolean {
  return examType === '正位X光片';
}

export function isLateralExamType(examType: string): boolean {
  return examType === '侧位X光片';
}

export function isKeypointSupportedExamType(examType: string): boolean {
  return isAnteriorExamType(examType) || isLateralExamType(examType);
}
