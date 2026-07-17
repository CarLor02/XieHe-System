/**
 * 类型定义文件
 * 统一管理所有相关的 TypeScript 类型和接口
 */

import {AnnotationBindings} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';

/**
 * 图像尺寸
 */
export interface ImageSize {
  width: number;
  height: number;
}

/*
* Measurement 部分的数据，现在存在一个和老版本兼容的问题
* 在 api/v1/image-files/{id} 这个接口中, annotation 字段是直接写在 ImageFile 这个结构体上的 JSON 对象,
* 能直接拿到 measurements 数据, 且字段更多更详细
* 对于测量数据(比如 T1 Tilt, CA), 比关键点数据多三个字段 upperVertebra, lowerVertebra, apexVertebra, 均为 string 类型
* 这三个字段只给 Cobb 类的数据用, 其他测量数据的这三个字段都是 null
* 但是如果用 api/v1/measurements/{id} 接口单独拿 measurement，就没有那三个字段的数据
* 目前我选择用 api/v1/image-files/{id} 这个接口里面的 annotation 字段直接拿标注信息
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

/*
* 测量数据结构体, api/v1/measurements/{image_id} 和 api/v1/image-files/{image_id} 这两个接口都能用
* */
export interface MeasurementData {
  id: string;
  type: string;
  originalType?: string // api/v1/measurements/{image_id} 接口不提供此字段, api/v1/image-files/{image_id} 的 annotation 部分反序列化后的 measurements 字段提供此字段
  value: string;
  points: Point[];
  description?: string | null; // 这个 description 字段描述的是一个测量项做什么
  upperVertebra?: string | null; // api/v1/measurements/{image_id} 接口不提供此字段, 这里做兼容考虑
  lowerVertebra?: string | null; // api/v1/measurements/{image_id} 接口不提供此字段, 这里做兼容考虑
  apexVertebra?: string | null; // api/v1/measurements/{image_id} 接口不提供此字段, 这里做兼容考虑
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

/*
* 这个只给 api/v1/measurements/{image_id} 这个接口用
* */
export interface MeasurementRecord {
  measurements: MeasurementData[];
  reportText?: string | null;
  savedAt: string;
}

export interface SaveMeasurementRecordRequest {
  imageId: string;
  patientId: number;
  examType: string;
  measurements: MeasurementData[];
  reportText?: string | null;
  savedAt: string;
}

/**
 * 影像数据
 */
export interface StudyData {
  id: number;
  study_id: string;
  patient_id: number;
  patient_name: string;
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

/**
 * 坐标转换上下文
 */
export interface TransformContext {
  imageNaturalSize: ImageSize | null;
  imagePosition: Point;
  imageScale: number;
  /**
   * 可选：容器尺寸。提供时 imageToScreen 直接使用此尺寸，绕开 DOM 查询。
   * 用于导出场景（无真实 DOM 容器）或需要固定视口大小的场景。
   */
  containerSize?: { width: number; height: number };
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
