/** 兼容查看器历史 `IMG0001` 路由参数，统一为后端数字主键。 */
export function parseImageFileApiId(imageId: string): number {
  const normalized = imageId.replace(/^IMG/i, '').replace(/^0+/, '') || '0';
  return Number(normalized);
}
