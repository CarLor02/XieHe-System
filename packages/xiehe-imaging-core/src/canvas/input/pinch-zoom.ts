import type { Point } from '../../contracts';

export interface PinchSnapshot {
  distance: number;
  midpoint: Point;
  imageScale: number;
  imagePosition: Point;
  containerCenter: Point;
}

export interface PinchViewport {
  imageScale: number;
  imagePosition: Point;
}

export function getPointerDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function getPointerMidpoint(first: Point, second: Point): Point {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

/**
 * 保持 pinch 开始时中点下的图像位置仍处于当前双指中点。
 * 这里只计算视口几何，不读取 DOM，也不关心输入设备。
 */
export function calculatePinchViewport(
  snapshot: PinchSnapshot,
  currentFirst: Point,
  currentSecond: Point,
  minScale = 0.1,
  maxScale = 5
): PinchViewport {
  const currentDistance = getPointerDistance(currentFirst, currentSecond);
  if (snapshot.distance <= 0 || currentDistance <= 0) {
    return {
      imageScale: snapshot.imageScale,
      imagePosition: snapshot.imagePosition,
    };
  }

  const imageScale = Math.max(
    minScale,
    Math.min(
      maxScale,
      snapshot.imageScale * (currentDistance / snapshot.distance)
    )
  );
  const scaleRatio = imageScale / snapshot.imageScale;
  const currentMidpoint = getPointerMidpoint(currentFirst, currentSecond);
  const startImageOffset = {
    x:
      snapshot.midpoint.x -
      snapshot.containerCenter.x -
      snapshot.imagePosition.x,
    y:
      snapshot.midpoint.y -
      snapshot.containerCenter.y -
      snapshot.imagePosition.y,
  };

  return {
    imageScale,
    imagePosition: {
      x:
        currentMidpoint.x -
        snapshot.containerCenter.x -
        startImageOffset.x * scaleRatio,
      y:
        currentMidpoint.y -
        snapshot.containerCenter.y -
        startImageOffset.y * scaleRatio,
    },
  };
}
