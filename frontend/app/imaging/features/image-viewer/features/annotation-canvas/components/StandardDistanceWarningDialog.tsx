'use client';

import OverlayPortal from '@/components/overlay/OverlayPortal';

interface StandardDistanceWarningDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function StandardDistanceWarningDialog({
  open,
  onClose,
}: StandardDistanceWarningDialogProps) {
  if (!open) return null;

  return (
    <OverlayPortal
      layer="modal"
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <i className="ri-alert-line text-2xl text-yellow-600"></i>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              请先设置标准距离
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              AVT和TTS测量需要先设置标准距离以确保测量准确性。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-blue-900 mb-2">
                操作步骤：
              </p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>点击右侧面板中的&quot;标准距离设置&quot;按钮</li>
                <li>在图像上标注两个已知距离的点</li>
                <li>输入实际距离值（单位：mm）</li>
                <li>确认后即可使用AVT/TTS测量工具</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            我知道了
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
