import type { TransformContext } from '@/app/imaging/features/image-viewer/features/annotation-canvas/domain/model/viewport-transform';
import type {
  ImageSize,
  Point,
} from '@/app/imaging/features/image-viewer/shared/types';

/**
 * 计算图像在 object-contain 模式下的显示尺寸
 */
function calculateDisplaySize(
  containerSize: ImageSize,
  imageNaturalSize: ImageSize
): { displayWidth: number; displayHeight: number } {
  const containerAspect = containerSize.width / containerSize.height;
  const imageAspect = imageNaturalSize.width / imageNaturalSize.height;

  let displayWidth: number, displayHeight: number;

  if (containerAspect > imageAspect) {
    displayHeight = containerSize.height;
    displayWidth = displayHeight * imageAspect;
  } else {
    displayWidth = containerSize.width;
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
  const { imageNaturalSize, imagePosition, imageScale, containerSize } =
    context;

  if (
    !imageNaturalSize ||
    !containerSize ||
    containerSize.width <= 0 ||
    containerSize.height <= 0
  ) {
    return { x: point.x, y: point.y };
  }

  const { displayWidth, displayHeight } = calculateDisplaySize(
    containerSize,
    imageNaturalSize
  );
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;

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
  const displayY =
    (relToImageCenterY / imageNaturalSize.height) * displayHeight;

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
  const { imageNaturalSize, imagePosition, imageScale, containerSize } =
    context;

  if (
    !imageNaturalSize ||
    !containerSize ||
    containerSize.width <= 0 ||
    containerSize.height <= 0
  ) {
    return { x: screenX, y: screenY };
  }

  const { displayWidth, displayHeight } = calculateDisplaySize(
    containerSize,
    imageNaturalSize
  );
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;

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
  const relToImageCenterY =
    (displayY / displayHeight) * imageNaturalSize.height;

  const imageX = relToImageCenterX + imageCenterX;
  const imageY = relToImageCenterY + imageCenterY;

  return { x: imageX, y: imageY };
}
