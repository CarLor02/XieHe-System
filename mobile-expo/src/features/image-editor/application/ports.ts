import type { ImageFileResponse } from '@xiehe/api-contracts/generated';
import type { AnnotationDocument } from '@xiehe/imaging-core/annotation-document';

export interface EditorPreview {
  uri: string;
  isThumbnail: boolean;
}

/** 编辑会话只接收读取、预览和版本化保存，不持有整个 SDK。 */
export interface ImageEditorGateway {
  getImage(imageId: number): Promise<ImageFileResponse>;
  getPreview(image: ImageFileResponse): Promise<EditorPreview>;
  save(input: {
    imageId: number;
    expectedVersion: number;
    annotation: AnnotationDocument;
  }): Promise<{ annotation_version: number }>;
}
