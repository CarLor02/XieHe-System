export type {
  AnnotationData,
  AnnotationDocument,
  CreateAnnotationDocumentInput,
} from './domain/annotation-document';
export { ANNOTATION_DOCUMENT_SCHEMA_VERSION } from './domain/annotation-document';
export {
  createAnnotationDocument,
  decodeAnnotationDocument,
} from './domain/annotation-document-codec';
export { scaleAnnotationDocument } from './domain/scale-annotation-document';
