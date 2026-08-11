import type { MeasurementData } from '../../shared/domain/contracts';

export interface MeasurementReportStudy {
  imageId: string;
  examType: string;
}

export interface MeasurementReportRequest {
  imageId: string;
  examType: string;
  measurements: Array<{
    type: string;
    value: string;
    description?: string;
  }>;
}

export type MeasurementReportPlan =
  | { status: 'empty'; message: string }
  | { status: 'ready'; request: MeasurementReportRequest };

/** 报告生成只准备后端协议，不在客户端生成医学诊断 fallback。 */
export function prepareMeasurementReport(input: {
  study: MeasurementReportStudy;
  measurements: readonly MeasurementData[];
}): MeasurementReportPlan {
  if (input.measurements.length === 0) {
    return {
      status: 'empty',
      message: '暂无测量数据，无法生成报告。请先进行相关测量。',
    };
  }
  return {
    status: 'ready',
    request: {
      imageId: input.study.imageId,
      examType: input.study.examType,
      measurements: input.measurements.map(measurement => ({
        type: measurement.type,
        value: measurement.value,
        ...(measurement.description
          ? { description: measurement.description }
          : {}),
      })),
    },
  };
}
