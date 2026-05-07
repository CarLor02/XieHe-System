import { EXAM_TYPES } from '@/app/imaging/domain/imagingFilters';
import type { ChangeTypeModalState } from '../hooks/useImageFileActions';

interface ChangeExamTypeModalProps {
  modal: ChangeTypeModalState;
  selectedExamType: string;
  loading: boolean;
  onChangeSelectedExamType: (examType: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ChangeExamTypeModal({
  modal,
  selectedExamType,
  loading,
  onChangeSelectedExamType,
  onClose,
  onConfirm,
}: ChangeExamTypeModalProps) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <i className="ri-edit-line text-blue-500 text-xl"></i>
          <h3 className="text-base font-semibold text-gray-800">
            修改检查类型
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-1">
          当前类型：
          <span className="font-medium text-gray-700">
            {modal.currentDesc || '未设置'}
          </span>
        </p>
        {modal.status !== 'UPLOADED' && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-3">
            ⚠️ 该影像已处理，修改类型可能影响分析结果解读
          </p>
        )}
        <select
          value={selectedExamType}
          onChange={event => onChangeSelectedExamType(event.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-3 mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">请选择检查类型</option>
          {EXAM_TYPES.map(examType => (
            <option key={examType} value={examType}>
              {examType}
            </option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={
              loading ||
              !selectedExamType ||
              selectedExamType === modal.currentDesc
            }
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
