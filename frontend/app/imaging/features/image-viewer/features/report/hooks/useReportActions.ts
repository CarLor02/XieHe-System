import { useCallback } from 'react';
import { ImageData, MeasurementData } from '@/app/imaging/features/image-viewer/shared/types';
import { generateReport } from '@/app/imaging/features/image-viewer/features/report/usecases/generateReportUseCase';

interface UseReportActionsOptions {
  imageData: ImageData;
  measurements: MeasurementData[];
  reportText: string;
  setReportText: (report: string) => void;
  setSaveMessage: (message: string) => void;
}

export function useReportActions({
  imageData,
  measurements,
  reportText,
  setReportText,
  setSaveMessage,
}: UseReportActionsOptions) {
  const handleReportGenerate = useCallback(() => {
    void generateReport(imageData, measurements, setReportText, setSaveMessage);
  }, [imageData, measurements, setReportText, setSaveMessage]);

  const handleCopyReport = useCallback(() => {
    navigator.clipboard.writeText(reportText);
    setSaveMessage('报告已复制到剪贴板');
    setTimeout(() => setSaveMessage(''), 2000);
  }, [reportText, setSaveMessage]);

  return {
    handleReportGenerate,
    handleCopyReport,
  };
}
