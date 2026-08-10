/**
 * 类型定义文件
 * 统一管理所有相关的 TypeScript 类型和接口
 */

import type { AiMeasurementInput } from '@xiehe/imaging-core/ai';

export interface KeypointSequenceSession {
  groupName: string;
  keypointIds: string[];
  currentIndex: number;
}

/*
 * AI 测量数据结构体
 * */
export type AiMeasurementData = AiMeasurementInput;

/**
 * 影像数据
 */
export interface StudyData {
  id: number;
  study_id: string;
  patient_id: number;
  patient_name: string;
  patient_identifier?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  study_date: string;
  study_description: string;
  modality: string;
  status: string;
  created_at: string;
}

/**
 * 图像数据（用于显示）
 */
export interface ImageData {
  id: string;
  patientName: string;
  patientId: string;
  patientIdentifier?: string | null;
  patientGender?: string | null;
  patientAge?: number | null;
  examType: string;
  studyDate: string;
  captureTime: string;
  seriesCount: number;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * 工具配置
 */
export interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsNeeded: number;
}

// /**
//  * 绘制状态
//  */
// export interface DrawingState {
//   isDrawing: boolean;
//   startPoint: Point | null;
//   currentPoint: Point | null;
// }
//
// /**
//  * 选择类型
//  */
// export type SelectionType = 'point' | 'whole' | null;

/**
 * 调整模式
 */
export type AdjustMode = 'none' | 'zoom' | 'brightness' | 'contrast';

// /**
//  * 边界框
//  */
// export interface BoundingBox {
//   minX: number;
//   maxX: number;
//   minY: number;
//   maxY: number;
// }
//
// /**
//  * 圆形数据
//  */
// export interface Circle {
//   id: string;
//   centerX: number;
//   centerY: number;
//   radius: number;
// }
//
// /**
//  * 椭圆数据
//  */
// export interface Ellipse {
//   id: string;
//   centerX: number;
//   centerY: number;
//   radiusX: number;
//   radiusY: number;
// }
//
// /**
//  * 矩形数据
//  */
// export interface Rectangle {
//   id: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }
//
// /**
//  * 箭头数据
//  */
// export interface Arrow {
//   id: string;
//   startX: number;
//   startY: number;
//   endX: number;
//   endY: number;
// }
//
// /**
//  * 多边形数据
//  */
// export interface Polygon {
//   id: string;
//   points: Point[];
// }

// 这个定义有问题, 先不要用, 先用 MeasurementService 定义的 AnnotationData
// /**
//  * 标注数据（用于保存/加载）
//  */
// export interface AnnotationData {
//   imageId: string;
//   imageWidth?: number;
//   imageHeight?: number;
//   measurements: Array<{
//     type: string;
//     points: Point[];
//   }>;
//   standardDistance?: number;
//   standardDistancePoints?: Point[];
// }

// /**
//  * 鼠标事件处理器参数
//  */
// export interface MouseEventParams {
//   x: number;
//   y: number;
//   button: number;
//   buttons: number;
// }
//
// /**
//  * 选择结果
//  */
// export interface SelectionResult {
//   found: boolean;
//   measurementId: string | null;
//   pointIndex: number | null;
//   selectionType: SelectionType;
// }
