import type { MeasurementData } from '../../shared/domain/contracts';
import {
  prepareMeasurementReport,
  type MeasurementReportRequest,
} from './prepare-measurement-report';

export interface MeasurementReportPort {
  generate(request: MeasurementReportRequest): Promise<{ report?: string }>;
}

export type MeasurementReportResult =
  | { status: 'empty'; message: string }
  | { status: 'success'; report: string };

export async function runMeasurementReport(input: {
  study: { imageId: string; examType: string };
  measurements: readonly MeasurementData[];
  port: MeasurementReportPort;
}): Promise<MeasurementReportResult> {
  const plan = prepareMeasurementReport(input);
  if (plan.status === 'empty') return plan;
  const response = await input.port.generate(plan.request);
  if (!response.report) throw new Error('报告生成失败');
  return { status: 'success', report: response.report };
}
