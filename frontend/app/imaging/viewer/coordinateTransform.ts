/**
 * 坐标转换工具函数
 * 处理图像坐标系和屏幕坐标系之间的转换
 */

import { SELECTORS } from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface TransformContext {
  imageNaturalSize: ImageSize | null;
  imagePosition: Point;
  imageScale: number;
}

// 警告节流：避免控制台被重复警告淹没
let lastWarningTime = 0;
const WARNING_THROTTLE_MS = 5000; // 5秒内只显示一次警告

/**
 * 节流的警告函数
 * 在开发环境中，5秒内最多显示一次相同的警告
 */
function throttledWarn(message: string) {
  const now = Date.now();
  if (now - lastWarningTime > WARNING_THROTTLE_MS) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message);
    }
    lastWarningTime = now;
  }
}

/**
 * 获取容器的矩形信息
 */
function getContainerRect(): DOMRect | null {
  const container = document.querySelector(SELECTORS.IMAGE_CANVAS);
  if (!container) {
    console.warn('Image canvas container not found');
    return null;
  }
  return container.getBoundingClientRect();
}

/**
 * 计算图像在 object-contain 模式下的显示尺寸
 */
function calculateDisplaySize(
  containerRect: DOMRect,
  imageNaturalSize: ImageSize
): { displayWidth: number; displayHeight: number } {
  const containerAspect = containerRect.width / containerRect.height;
  const imageAspect = imageNaturalSize.width / imageNaturalSize.height;

  let displayWidth: number, displayHeight: number;

  if (containerAspect > imageAspect) {
    // 容器更宽，图像按高度适配
    displayHeight = containerRect.height;
    displayWidth = displayHeight * imageAspect;
  } else {
    // 容器更高，图像按宽度适配
    displayWidth = containerRect.width;
    displayHeight = displayWidth / imageAspect;
  }

  return { displayWidth, displayHeight };
}

/**
 * 将图像坐标系转换为屏幕坐标系
 * 
 * 图像坐标系：左上角为原点，右为x正，下为y正（标准图像坐标系）
 * 屏幕坐标系：容器内的显示坐标（相对于容器左上角）
 * 
 * @param point 图像坐标点
 * @param context 转换上下文（包含图像尺寸、位置、缩放）
 * @returns 屏幕坐标点
 */
export function imageToScreen(point: Point, context: TransformContext): Point {
  const { imageNaturalSize, imagePosition, imageScale } = context;

  if (!imageNaturalSize) {
    throttledWarn('Image natural size not available, returning original coordinates');
    return { x: point.x, y: point.y };
  }

  const containerRect = getContainerRect();
  if (!containerRect) {
    return { x: point.x, y: point.y };
  }

  // 计算图像在object-contain模式下的实际显示尺寸
  const { displayWidth, displayHeight } = calculateDisplaySize(
    containerRect,
    imageNaturalSize
  );

  // 容器中心点（也是图像transform的原点）
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // 图像中心点坐标
  const imageCenterX = imageNaturalSize.width / 2;
  const imageCenterY = imageNaturalSize.height / 2;

  // 转换步骤（关键：transform origin是center center）：
  // 1. 图像像素坐标 - 图像中心 = 相对于图像中心的坐标
  // 2. / imageNaturalSize * displaySize = 缩放到显示尺寸
  // 3. * imageScale = 用户缩放
  // 4. + imagePosition = 用户平移（相对于容器中心）
  // 5. + centerX = 转到容器坐标系
  const relToImageCenterX = point.x - imageCenterX;
  const relToImageCenterY = point.y - imageCenterY;

  const displayX = (relToImageCenterX / imageNaturalSize.width) * displayWidth;
  const displayY = (relToImageCenterY / imageNaturalSize.height) * displayHeight;

  const scaledX = displayX * imageScale;
  const scaledY = displayY * imageScale;

  const screenX = scaledX + imagePosition.x + centerX;
  const screenY = scaledY + imagePosition.y + centerY;

  return { x: screenX, y: screenY };
}

/**
 * 将屏幕坐标系转换为图像坐标系
 * 
 * 屏幕坐标系：容器内的显示坐标（相对于容器左上角，从handleMouseDown/Move传入）
 * 图像坐标系：左上角为原点，右为x正，下为y正（标准图像坐标系）
 * 
 * @param screenX 屏幕X坐标
 * @param screenY 屏幕Y坐标
 * @param context 转换上下文（包含图像尺寸、位置、缩放）
 * @returns 图像坐标点
 */
export function screenToImage(
  screenX: number,
  screenY: number,
  context: TransformContext
): Point {
  const { imageNaturalSize, imagePosition, imageScale } = context;

  if (!imageNaturalSize) {
    throttledWarn('Image natural size not available, returning original coordinates');
    return { x: screenX, y: screenY };
  }

  const containerRect = getContainerRect();
  if (!containerRect) {
    return { x: screenX, y: screenY };
  }

  // 计算图像在object-contain模式下的实际显示尺寸
  const { displayWidth, displayHeight } = calculateDisplaySize(
    containerRect,
    imageNaturalSize
  );

  // 容器中心点（也是图像transform的原点）
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // 图像中心点坐标
  const imageCenterX = imageNaturalSize.width / 2;
  const imageCenterY = imageNaturalSize.height / 2;

  // 逆向转换步骤：
  // 1. screenX - centerX = 从容器坐标系转到中心坐标系
  // 2. - imagePosition = 减去用户平移
  // 3. / imageScale = 除以用户缩放
  // 4. / displaySize * imageNaturalSize = 转换为图像坐标（相对于图像中心）
  // 5. + 图像中心 = 转换为图像像素坐标（相对于左上角）
  const relToCenterX = screenX - centerX - imagePosition.x;
  const relToCenterY = screenY - centerY - imagePosition.y;

  const displayX = relToCenterX / imageScale;
  const displayY = relToCenterY / imageScale;

  const relToImageCenterX = (displayX / displayWidth) * imageNaturalSize.width;
  const relToImageCenterY = (displayY / displayHeight) * imageNaturalSize.height;

  const imageX = relToImageCenterX + imageCenterX;
  const imageY = relToImageCenterY + imageCenterY;

  return { x: imageX, y: imageY };
}

