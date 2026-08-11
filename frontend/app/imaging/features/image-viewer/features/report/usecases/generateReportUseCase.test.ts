import { afterEach, expect, it, jest } from '@jest/globals';

import type { generateMeasurementReport } from '@/services/imageServices';

jest.mock('@/services/imageServices', () => ({
  generateMeasurementReport: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: jest.fn() }),
}));

const service = jest.requireMock('@/services/imageServices') as {
  generateMeasurementReport: jest.MockedFunction<
    typeof generateMeasurementReport
  >;
};
const { generateReport } = jest.requireActual<
  typeof import('./generateReportUseCase')
>('./generateReportUseCase');

afterEach(() => {
  jest.restoreAllMocks();
});

it('uses only the backend report and does not generate a local medical fallback', async () => {
  service.generateMeasurementReport.mockRejectedValue(new Error('offline'));
  const setReportText = jest.fn();
  const setSaveMessage = jest.fn();

  await generateReport(
    {
      id: '1',
      patientName: '患者',
      patientId: 'P1',
      examType: '正位X光片',
      studyDate: '2026-08-11',
      captureTime: '',
      seriesCount: 1,
      status: 'completed',
    },
    [{ id: 'm1', type: 'cobb1', value: '20°', points: [] }],
    setReportText,
    setSaveMessage
  );

  expect(setReportText).not.toHaveBeenCalled();
  expect(setSaveMessage).toHaveBeenCalledWith(
    '报告生成失败，请检查服务是否正常运行'
  );
});
