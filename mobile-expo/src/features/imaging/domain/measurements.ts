import {
  decodeAnnotationDocument,
  getAnnotationTypeId,
} from '@xiehe/imaging-core';
import { getToolsForExamType } from '@xiehe/imaging-catalog/tools';
import type {
  ImageFileDetail,
  PredictMeasurementsResponse,
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
export function predictedMeasurements(
  response: PredictMeasurementsResponse,
  examType: string
): ReportMeasurementItem[] {
  // Preserve the verified value field. In older AP responses angle may carry the opposite sign.
  return response.measurements.map(item => ({
    type: item.type,
    value: item.value ?? '',
    description: describe(item.type, examType),
  }));
}
export function savedReport(image: ImageFileDetail): string {
  return decodeAnnotationDocument(image.annotation)?.reportText ?? '';
}
