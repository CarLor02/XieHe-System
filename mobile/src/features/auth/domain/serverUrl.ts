export function normalizeServerUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('请输入完整的后端地址，例如 https://xiehe.stellarmesh.cn');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      '后端地址须使用 HTTP 或 HTTPS，不能包含账号、查询参数或片段'
    );
  }
  if (url.pathname !== '/' && url.pathname !== '')
    throw new Error('请填写后端根地址，不包含 /api/v1 等接口路径');
  return url.origin;
}
