/**
 * 类型定义文件
 * 统一管理所有相关的 TypeScript 类型和接口
 */

import {AnnotationBindings} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import type { AvtMetadata } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/ap/avt/types';
import type { PelvicMeasurementMetadata } from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic/types';

/**
 * 图像尺寸
 */
export interface ImageSize {
  width: number;
  height: number;
}

/*
* Measurement 是 image_files.annotation 当前快照的一部分。
* Cobb 类测量会额外保存 upperVertebra、lowerVertebra 和 apexVertebra。
* */

/*
* 点 数据结构体, 测量数据 和 关键点数据 都会用到
* */
export interface Point {
  x: number;
  y: number;
}

export interface KeypointSequenceSession {
  groupName: string;
  keypointIds: string[];
  currentIndex: number;
}

export enum AnnotationSource {
  AI = 'ai',
  MANUAL = 'manual',
}

/* 测量数据结构体，对应 image_files.annotation.measurements。 */
export interface MeasurementData {
  id: string;
  type: string;
  originalType?: string
  value: string;
  points: Point[];
  description?: string | null; // 这个 description 字段描述的是一个测量项做什么
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
  apexVertebra?: string | null;
  avtMetadata?: AvtMetadata; // AVT v2: 椎体/椎间盘目标、参考线与点位布局
  pelvicMetadata?: PelvicMeasurementMetadata; // PI/PT/TPA v2: 单 FH 或双 FH 的真实关键点依赖
  keypointSynced?: boolean; // 测量项已绑定关键点；后续关键点移动或缺失时应重算或移除
}

/**
 * 椎体标注层 —— AI 检测输出的结构化椎体角点。
 * 用于独立于 measurements[] 之外的 vertebraeLayer 状态，不与测量标注混用。
 *
 * corners 的顺序与 aiDetectionUseCase 保持一致：
 *   0 = topLeft（左上）
 *   1 = topRight（右上）
 *   2 = bottomLeft（左下）
 *   3 = bottomRight（右下）
 */
export interface VertebraAnnotation {
  label: string;       // 椎体名称，如 "T1"、"L5"
  corners: [Point, Point, Point, Point]; // [TL, TR, BL, BR]
  confidence: number;
  source: AnnotationSource;
}

/**
 * 股骨头标注（侧位专用，单中心点）
 */
export interface CfhAnnotation {
  center: Point;
  confidence: number;
  source: AnnotationSource;
}

/*
* AI 测量数据结构体
* */
export interface AiMeasurementData {
  type: string;
  points: Point[];
  angle?: number;
  upper_vertebra?: string;
  lower_vertebra?: string;
  apex_vertebra?: string;
}

/*
* 标注数据结构体, 对应 api/v1/image-files/{image_id} 返回的 annotation JSON 对象
* */
export interface AnnotationData {
  measurements: MeasurementData[];
  standardDistance: number;
  standardDistancePoints: Point[];
  pointBindings: AnnotationBindings;
  imageWidth: number;
  imageHeight: number;
  savedAt: string;
  /** 椎体角点层（admin 拖拽调整后持久化，下次打开可恢复） */
  vertebraeLayer?: VertebraAnnotation[];
  /** 股骨头标注（侧位专用） */
  cfhAnnotation?: CfhAnnotation | null;
}

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
