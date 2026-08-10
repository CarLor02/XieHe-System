export type ToolExamKind = 'ap' | 'lateral' | 'bending' | 'generic';
export type ToolAnnotationCategory = 'measurement' | 'auxiliary';
export type ToolToolbarSection = 'measurement' | 'auxiliary';

/**
 * 跨端稳定的工具能力。中文文案、图标、颜色和 renderer 属于平台展示 catalog，
 * 不进入该结构。
 *
 * annotationCategory 决定结果记录语义；toolbarSection 决定工具栏分组。二者
 * 必须分开，例如 aux-angle 在辅助图形区创建，但结果仍是测量类标注。
 */
export interface ToolCapability {
  id: string;
  pointsNeeded: number;
  annotationCategory: ToolAnnotationCategory;
  toolbarSection: ToolToolbarSection;
  interactionKind: ToolToolbarSection;
  supportedExamKinds: readonly ToolExamKind[];
  pointCollection: 'fixed' | 'dynamic';
}
