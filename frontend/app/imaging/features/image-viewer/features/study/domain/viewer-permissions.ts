/**
 * 标注页前端行为不再按管理员/医生拆分，JSON 导出除外。
 * 这里仅表达 viewer 内部交互策略；接口鉴权仍由 API 层处理。
 */
type ViewerUser = {
  is_superuser?: boolean;
  is_system_admin?: boolean;
} | null | undefined;

export function canUseKeypointTools(): boolean {
  return true;
}

export function canExportAnnotationsJson(user: ViewerUser): boolean {
  return user?.is_superuser === true || user?.is_system_admin === true;
}
