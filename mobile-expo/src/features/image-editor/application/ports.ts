import type { AiMeasurementPort } from '@xiehe/imaging-core/ai';
import type { MeasurementReportPort } from '@xiehe/imaging-core/reports';
import type { ImageFileResponse } from '@xiehe/api-contracts/generated';
import type { AnnotationDocument } from '@xiehe/imaging-core/annotation-document';

export interface EditorPreview {
  uri: string;
  isThumbnail: boolean;
}

/** 编辑会话接收影像、AI、报告与版本化保存端口，不持有整个 SDK。 */
export interface ImageEditorGateway {
  measure: AiMeasurementPort<number>['measure'];
  generate: MeasurementReportPort['generate'];
  getImage(imageId: number): Promise<ImageFileResponse>;
  getPreview(image: ImageFileResponse): Promise<EditorPreview>;
  save(input: {
    imageId: number;
    expectedVersion: number;
    annotation: AnnotationDocument;
  }): Promise<{ annotation_version: number }>;
}
