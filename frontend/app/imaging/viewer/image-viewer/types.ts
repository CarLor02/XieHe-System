/**
 * 类型定义文件
 * 统一管理所有相关的 TypeScript 类型和接口
 */

/**
 * 图像尺寸
 */
export interface ImageSize {
  width: number;
  height: number;
}

/*
* 点 数据结构体, 测量数据 和 关键点数据 都会用到
* */
export interface Point {
  x: number;
  y: number;
}

/*
* 运行时测量投影。V2 标注结构中，医学测量项由 keypoints 推导，不再作为事实数据持久化。
* 辅助图形和少数纯手工项仍复用该结构保存到 auxiliaryAnnotations。
* */
export interface MeasurementData {
  id: string;
  type: string;
  originalType?: string;
  value: string;
  points: Point[];
  description?: string | null; // 这个 description 字段描述的是一个测量项做什么
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
  apexVertebra?: string | null;
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
  source: 'ai' | 'manual';
}

/**
 * 股骨头标注（侧位专用，单中心点）
 */
export interface CfhAnnotation {
  center: Point;
  confidence: number;
  source: 'ai' | 'manual';
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

export type AnnotationSchemaVersion = 2;

export interface PersistedKeypointAnnotation {
  id: string;
  point: Point;
  source: 'ai' | 'manual';
  confidence: number;
}

export interface MeasurementProjectionBinding {
  id: string;
  type: string;
  upperVertebra?: string | null;
  lowerVertebra?: string | null;
  apexVertebra?: string | null;
}

/*
 * 新标注结构：医学标注只持久化关键点。
 * measurements 仅作为运行时投影由关键点推导，辅助图形保存在 auxiliaryAnnotations。
 */
export interface AnnotationDataV2 {
  version: AnnotationSchemaVersion;
  schema: 'keypoints-only';
  imageId: string;
  examType: string;
  keypoints: PersistedKeypointAnnotation[];
  auxiliaryAnnotations: MeasurementData[];
  measurementBindings: MeasurementProjectionBinding[];
  suppressedMeasurementIds: string[];
  standardDistance: number | null;
  standardDistancePoints: Point[];
  imageWidth?: number;
  imageHeight?: number;
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
