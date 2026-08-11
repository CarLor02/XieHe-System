/** 编辑器跨平台使用的影像上下文，不包含任何 Web 展示对象。 */
export interface ImageData {
  id: string;
  patientName: string;
  patientId: string;
  patientIdentifier?: string | null;
  patientGender?: string | null;
  patientAge?: number | null;
  examType: string;
  studyDate: string;
  captureTime: string;
  seriesCount: number;
  status: 'pending' | 'completed' | 'failed';
}
