/**
 * 选择检测工具函数
 * 处理点击检测、悬浮检测等选择相关逻辑
 */

import { Point } from './geometryUtils';
import {
  calculateDistance,
  pointToLineDistance,
  isPointNearCircle,
  isPointNearEllipse,
} from './geometryUtils';
import { INTERACTION_CONSTANTS } from './constants';
import { imageToScreen, TransformContext } from './coordinateTransform';

export interface Measurement {
  id: string;
  type: string;
  value: string;
  points: Point[];
  description?: string;
}

/**
 * 检查是否点击了某个点
 * @param clickPoint 点击位置（屏幕坐标）
 * @param targetPoint 目标点（图像坐标）
 * @param context 转换上下文
 * @param radius 检测半径（屏幕像素）
 * @returns 是否点击了该点
 */
export function isPointClicked(
  clickPoint: Point,
  targetPoint: Point,
  context: TransformContext,
  radius: number = INTERACTION_CONSTANTS.POINT_CLICK_RADIUS
): boolean {
  const targetScreen = imageToScreen(targetPoint, context);
  const distance = calculateDistance(clickPoint, targetScreen);
  return distance < radius;
}

/**
 * 检查是否点击了线段
 * @param clickPoint 点击位置（屏幕坐标）
 * @param lineStart 线段起点（图像坐标）
 * @param lineEnd 线段终点（图像坐标）
 * @param context 转换上下文
 * @param radius 检测半径（屏幕像素）
 * @returns 是否点击了该线段
 */
export function isLineClicked(
  clickPoint: Point,
  lineStart: Point,
  lineEnd: Point,
  context: TransformContext,
  radius: number = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS
): boolean {
  const startScreen = imageToScreen(lineStart, context);
  const endScreen = imageToScreen(lineEnd, context);
  const distance = pointToLineDistance(clickPoint, startScreen, endScreen);
  return distance < radius;
}

/**
 * 检查是否点击了圆形边界
 * @param clickPoint 点击位置（屏幕坐标）
 * @param center 圆心（图像坐标）
 * @param edge 圆边缘点（图像坐标）
 * @param context 转换上下文
 * @param tolerance 容差（屏幕像素）
 * @returns 是否点击了圆形边界
 */
export function isCircleClicked(
  clickPoint: Point,
  center: Point,
  edge: Point,
  context: TransformContext,
  tolerance: number = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS
): boolean {
  const centerScreen = imageToScreen(center, context);
  const edgeScreen = imageToScreen(edge, context);
  const screenRadius = calculateDistance(centerScreen, edgeScreen);
  
  return isPointNearCircle(clickPoint, centerScreen, screenRadius, tolerance);
}

/**
 * 检查是否点击了椭圆边界
 * @param clickPoint 点击位置（屏幕坐标）
 * @param center 椭圆中心（图像坐标）
 * @param edge 椭圆边缘点（图像坐标）
 * @param context 转换上下文
 * @param tolerance 容差（屏幕像素）
 * @returns 是否点击了椭圆边界
 */
export function isEllipseClicked(
  clickPoint: Point,
  center: Point,
  edge: Point,
  context: TransformContext,
  tolerance: number = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS
): boolean {
  const centerScreen = imageToScreen(center, context);
  const edgeScreen = imageToScreen(edge, context);
  const radiusX = Math.abs(edgeScreen.x - centerScreen.x);
  const radiusY = Math.abs(edgeScreen.y - centerScreen.y);

  if (radiusX === 0 || radiusY === 0) return false;

  return isPointNearEllipse(clickPoint, centerScreen, radiusX, radiusY, tolerance);
}

/**
 * 检查是否点击了矩形边界
 * @param clickPoint 点击位置（屏幕坐标）
 * @param rectStart 矩形起点（图像坐标）
 * @param rectEnd 矩形终点（图像坐标）
 * @param context 转换上下文
 * @param tolerance 容差（屏幕像素）
 * @returns 是否点击了矩形边界
 */
export function isRectangleClicked(
  clickPoint: Point,
  rectStart: Point,
  rectEnd: Point,
  context: TransformContext,
  tolerance: number = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS
): boolean {
  const p1Screen = imageToScreen(rectStart, context);
  const p2Screen = imageToScreen(rectEnd, context);
  
  const minX = Math.min(p1Screen.x, p2Screen.x);
  const maxX = Math.max(p1Screen.x, p2Screen.x);
  const minY = Math.min(p1Screen.y, p2Screen.y);
  const maxY = Math.max(p1Screen.y, p2Screen.y);

  // 检查是否点击了四条边中的任意一条
  const distToLeft = Math.abs(clickPoint.x - minX);
  const distToRight = Math.abs(clickPoint.x - maxX);
  const distToTop = Math.abs(clickPoint.y - minY);
  const distToBottom = Math.abs(clickPoint.y - maxY);

  const onLeftOrRight =
    (distToLeft < tolerance || distToRight < tolerance) &&
    clickPoint.y >= minY - tolerance &&
    clickPoint.y <= maxY + tolerance;
  const onTopOrBottom =
    (distToTop < tolerance || distToBottom < tolerance) &&
    clickPoint.x >= minX - tolerance &&
    clickPoint.x <= maxX + tolerance;

  return onLeftOrRight || onTopOrBottom;
}

/**
 * 检查是否点击了多边形的任意一条边
 * @param clickPoint 点击位置（屏幕坐标）
 * @param points 多边形顶点（图像坐标）
 * @param context 转换上下文
 * @param tolerance 容差（屏幕像素）
 * @returns 是否点击了多边形边界
 */
export function isPolygonClicked(
  clickPoint: Point,
  points: Point[],
  context: TransformContext,
  tolerance: number = INTERACTION_CONSTANTS.LINE_CLICK_RADIUS
): boolean {
  if (points.length < 3) return false;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    
    if (isLineClicked(clickPoint, current, next, context, tolerance)) {
      return true;
    }
  }

  return false;
}

