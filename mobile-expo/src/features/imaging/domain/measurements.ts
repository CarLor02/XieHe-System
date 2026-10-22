import {
  decodeAnnotationDocument,
  getAnnotationTypeId,
} from '@xiehe/imaging-core';
import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import type {
  ImageFileDetail,
  ReportMeasurementItem,
} from '@xiehe/api-contracts';

function describe(type: string, examType: string) {
  const id = getAnnotationTypeId(type);
  return (
    getToolsForExamType(examType).find(tool => tool.id === id)?.name ?? type
  );
}
export function savedMeasurements(
  image: ImageFileDetail
): ReportMeasurementItem[] {
  return (decodeAnnotationDocument(image.annotation)?.measurements ?? []).map(
    item => ({
      type: item.type,
      value: item.value,
      description:
        item.description ?? describe(item.type, image.description ?? ''),
    })
  );
}
export function savedReport(image: ImageFileDetail): string {
  return decodeAnnotationDocument(image.annotation)?.reportText ?? '';
}
