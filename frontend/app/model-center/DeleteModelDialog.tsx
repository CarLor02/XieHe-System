'use client';

interface DeleteModelDialogProps {
  isOpen: boolean;
  model: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModelDialog({ 
  isOpen, 
  model, 
  onConfirm, 
  onCancel 
}: DeleteModelDialogProps) {
  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-red-200 pointer-events-auto">
        <div className="flex items-center mb-4">
          <i className="ri-error-warning-line text-3xl text-red-500 mr-3"></i>
          <h3 className="text-lg font-bold">确认删除模型？</h3>
        </div>
        
        <p className="text-gray-600 mb-2">
          您正在删除模型 <strong className="text-gray-900">"{model.title}"</strong>
        </p>
        
        {model.isActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 mt-4">
            <p className="text-yellow-800 text-sm flex items-start">
              <i className="ri-alert-line text-lg mr-2 flex-shrink-0 mt-0.5"></i>
              <span>此模型当前正在使用中，删除后将自动切换到系统默认模型</span>
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

