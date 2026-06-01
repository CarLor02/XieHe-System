'use client';

import {
  BASIC_MODE_ICONS,
  BASIC_MODE_LABELS,
  BasicMode,
} from '@/app/imaging/features/image-viewer/features/toolbar/components/basic-mode';

interface BasicModePanelProps {
  modes: BasicMode[];
  currentMode: BasicMode;
  isImagePanLocked: boolean;
  onSelectMode: (mode: BasicMode) => void;
  onToggleImagePanLocked: () => void;
}

export default function BasicModePanel({
  modes,
  currentMode,
  isImagePanLocked,
  onSelectMode,
  onToggleImagePanLocked,
}: BasicModePanelProps) {
  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5 leading-none">
        <i className="ri-hand-line w-4 h-4 inline-flex items-center justify-center text-sm leading-none"></i>
        <span className="leading-none">基础模式</span>
      </h4>
      <div className="flex flex-wrap gap-2">
        {modes.map(mode => {
          const isSelected = currentMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelectMode(mode)}
              className={`rounded-lg flex-1 min-w-[78px] h-12 transition-all relative flex flex-col ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={BASIC_MODE_LABELS[mode]}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="flex flex-col text-center"
                style={{
                  transform: 'translateY(0)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  display: 'flex',
                }}
              >
                <i
                  className={`${BASIC_MODE_ICONS[mode]} text-lg mb-1`}
                  style={{ lineHeight: '1' }}
                ></i>
                <span
                  className="text-xs text-center leading-tight"
                  style={{ lineHeight: '1.1' }}
                >
                  {BASIC_MODE_LABELS[mode]}
                </span>
              </div>
              {isSelected && (
                <i className="ri-check-line w-3 h-3 flex items-center justify-center text-blue-200 absolute -top-1 -right-1 bg-blue-500 rounded-full"></i>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={onToggleImagePanLocked}
          className={`rounded-lg w-full h-10 transition-all relative flex items-center justify-center gap-2 ${
            isImagePanLocked
              ? 'bg-yellow-600 text-white ring-2 ring-yellow-400 shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title={
            isImagePanLocked
              ? '图像已锁定，点击解锁'
              : '锁定图像平移，防止拖拽时移动图像'
          }
        >
          <i
            className={
              isImagePanLocked
                ? 'ri-lock-line text-base'
                : 'ri-lock-unlock-line text-base'
            }
          ></i>
          <span className="text-xs">
            {isImagePanLocked ? '已锁定' : '锁定图像'}
          </span>
          {isImagePanLocked && (
            <i className="ri-check-line w-3 h-3 flex items-center justify-center text-yellow-200 absolute -top-1 -right-1 bg-yellow-500 rounded-full"></i>
          )}
        </button>
      </div>
    </div>
  );
}
