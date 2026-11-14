import type { ImageSize } from '@xiehe/imaging-core/contracts';
import type { Viewport } from './canvasGestureModel';

/** 余量以屏幕布局单位计，避免大倍率时按整张影像分配位图。 */
export function cacheMargin(size: ImageSize): number {
  'worklet';
  return Math.min(96, Math.ceil(Math.min(size.width, size.height) / 4));
}

export function needsViewportRedraw(
  rendered: Viewport,
  live: Viewport,
  size: ImageSize
): boolean {
  'worklet';
  const ratio = live.imageScale / rendered.imageScale;
  // 在手势中分段重绘文字、点和箭头，区间内由原生合成连续跟随。
  if (ratio >= 1.1 || ratio <= 1 / 1.1) return true;
  // 把当前视窗反投影回缓存。消耗半数余量时提前请求下一张，给 React 留出提交时间。
  const margin = cacheMargin(size) / 2;
  const extentChange = 1 / ratio - 1;
  return (
    Math.abs(rendered.imagePosition.x - live.imagePosition.x / ratio) +
      (size.width / 2) * extentChange >=
      margin ||
    Math.abs(rendered.imagePosition.y - live.imagePosition.y / ratio) +
      (size.height / 2) * extentChange >=
      margin
  );
}
