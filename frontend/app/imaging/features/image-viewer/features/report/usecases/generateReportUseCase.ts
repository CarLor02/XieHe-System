import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import { runMeasurementReport } from '@xiehe/imaging-core/reports';

import type { ImageData } from '@xiehe/imaging-core/editor';
import { createLogger } from '@/lib/logger';
import { generateMeasurementReport } from '@/services/imageServices';

const logger = createLogger(
  'app.imaging.features.image.viewer.features.report.usecases.generateReportUseCase'
);

export async function generateReport(
  imageData: ImageData,
  measurements: MeasurementData[],
  setReportText: (text: string) => void,
  setSaveMessage: (text: string) => void
) {
  try {
    const result = await runMeasurementReport({
      study: { imageId: imageData.id, examType: imageData.examType },
      measurements,
      port: { generate: generateMeasurementReport },
    });
    if (result.status === 'empty') {
      setReportText(result.message);
      return;
    }
    setReportText(result.report);
    setSaveMessage('报告生成成功');
    setTimeout(() => setSaveMessage(''), 3000);
  } catch (error) {
    logger.error('生成报告失败:', error);
    // 医学报告只接受后端生成结果，客户端不再产生诊断性 fallback 文本。
    setSaveMessage('报告生成失败，请检查服务是否正常运行');
    setTimeout(() => setSaveMessage(''), 5000);
  }
}
