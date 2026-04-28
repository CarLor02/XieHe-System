'use client';

import { useEffect, useRef, useState } from 'react';

export interface UploadOptionsFile {
  id: string;
  name: string;
  previewUrl: string;
  examType: string;
  flipped: boolean;
  cropped: boolean;
  mimeType: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UploadOptionsOverlayProps {
  file: UploadOptionsFile;
  examTypes: string[];
  onExamTypeChange: (fileId: string, examType: string) => void;
  onFlip: (fileId: string) => void;
  onCrop: (fileId: string, crop: CropArea) => void | Promise<void>;
  onClose: () => void;
  onConfirm: () => void;
}

type CropGesture =
  | { action: 'move' | 'nw' | 'ne' | 'sw' | 'se'; x: number; y: number; crop: CropArea }
  | null;

const defaultCrop: CropArea = {
  x: 0.06,
  y: 0.04,
  width: 0.88,
  height: 0.9,
};

const minCropSize = 0.08;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function UploadOptionsOverlay({
  file,
  examTypes,
  onExamTypeChange,
  onFlip,
  onCrop,
  onClose,
  onConfirm,
}: UploadOptionsOverlayProps) {
  const imageBoxRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<CropGesture>(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>(defaultCrop);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [cropApplying, setCropApplying] = useState(false);

  const canAdjustPixels = file.mimeType.startsWith('image/');

  useEffect(() => {
    setCropMode(false);
    setCropArea(defaultCrop);
    setImageLoadFailed(false);
    setCropApplying(false);
  }, [file.id]);

  useEffect(() => {
    if (!cropMode) return;

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      const rect = imageBoxRef.current?.getBoundingClientRect();
      if (!gesture || !rect || rect.width <= 0 || rect.height <= 0) return;

      const dx = (event.clientX - gesture.x) / rect.width;
      const dy = (event.clientY - gesture.y) / rect.height;
      const start = gesture.crop;

      if (gesture.action === 'move') {
        setCropArea({
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.width),
          y: clamp(start.y + dy, 0, 1 - start.height),
        });
        return;
      }

      let nextX = start.x;
      let nextY = start.y;
      let nextWidth = start.width;
      let nextHeight = start.height;

      if (gesture.action.includes('w')) {
        const right = start.x + start.width;
        nextX = clamp(start.x + dx, 0, right - minCropSize);
        nextWidth = right - nextX;
      }
      if (gesture.action.includes('e')) {
        nextWidth = clamp(start.width + dx, minCropSize, 1 - start.x);
      }
      if (gesture.action.includes('n')) {
        const bottom = start.y + start.height;
        nextY = clamp(start.y + dy, 0, bottom - minCropSize);
        nextHeight = bottom - nextY;
      }
      if (gesture.action.includes('s')) {
        nextHeight = clamp(start.height + dy, minCropSize, 1 - start.y);
      }

      setCropArea({
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      });
    };

    const handlePointerUp = () => {
      gestureRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [cropMode]);

  const beginCropGesture = (
    action: NonNullable<CropGesture>['action'],
    event: React.PointerEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    gestureRef.current = {
      action,
      x: event.clientX,
      y: event.clientY,
      crop: cropArea,
    };
  };

  const applyCurrentCrop = async () => {
    if (!canAdjustPixels || imageLoadFailed || cropApplying) return;
    setCropApplying(true);
    try {
      await onCrop(file.id, cropArea);
      setCropMode(false);
    } finally {
      setCropApplying(false);
    }
  };

  const handleCropClick = () => {
    if (!canAdjustPixels || imageLoadFailed || cropApplying) return;
    if (!cropMode) {
      setCropMode(true);
      return;
    }
    void applyCurrentCrop();
  };

  const handleConfirmClick = async () => {
    if (cropMode) {
      await applyCurrentCrop();
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/45 px-6 py-8">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">检查影像</h2>
            <p className="mt-1 text-sm text-gray-500">确认影像信息并进行必要调整</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="关闭"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="mx-8 border-t border-gray-200"></div>

        <div className="grid grid-cols-[minmax(0,1fr)_350px] gap-6 px-8 py-8">
          <div className="overflow-hidden rounded-lg bg-black">
            <div className="relative flex h-[68vh] max-h-[760px] min-h-[420px] items-center justify-center">
              {canAdjustPixels && !imageLoadFailed ? (
                <div ref={imageBoxRef} className="relative inline-block max-h-full max-w-full">
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="block max-h-[68vh] max-w-full object-contain"
                    onError={() => setImageLoadFailed(true)}
                  />
                  {cropMode && (
                    <div className="absolute inset-0 cursor-crosshair bg-black/35">
                      <div
                        className="absolute border-2 border-blue-400 bg-blue-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                        style={{
                          left: `${cropArea.x * 100}%`,
                          top: `${cropArea.y * 100}%`,
                          width: `${cropArea.width * 100}%`,
                          height: `${cropArea.height * 100}%`,
                        }}
                        onPointerDown={event => beginCropGesture('move', event)}
                      >
                        {(['nw', 'ne', 'sw', 'se'] as const).map(handle => (
                          <span
                            key={handle}
                            className={`absolute h-4 w-4 rounded-full border-2 border-white bg-blue-500 ${
                              handle === 'nw'
                                ? '-left-2 -top-2 cursor-nwse-resize'
                                : handle === 'ne'
                                  ? '-right-2 -top-2 cursor-nesw-resize'
                                  : handle === 'sw'
                                    ? '-bottom-2 -left-2 cursor-nesw-resize'
                                    : '-bottom-2 -right-2 cursor-nwse-resize'
                            }`}
                            onPointerDown={event => beginCropGesture(handle, event)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-8 text-center text-sm text-white/75">
                  当前文件无法直接预览，仍可选择影像类别后上传。
                </div>
              )}

              <div className="absolute left-5 top-5 max-w-[70%] truncate rounded bg-black/35 px-3 py-1 text-sm font-medium text-white">
                {file.name}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              影像类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={file.examType}
              onChange={event => onExamTypeChange(file.id, event.target.value)}
              className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {examTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <div className="mb-6 border-t border-gray-200"></div>

            <div className="mb-4 text-sm font-medium text-gray-700">影像调整</div>
            <div className="space-y-3">
              <button
                onClick={() => onFlip(file.id)}
                disabled={!canAdjustPixels || imageLoadFailed || cropApplying}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="ri-arrow-left-right-line text-lg"></i>
                左右翻转{file.flipped ? '（已翻转）' : ''}
              </button>
              <button
                onClick={handleCropClick}
                disabled={!canAdjustPixels || imageLoadFailed || cropApplying}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  cropMode
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <i className="ri-crop-line text-lg"></i>
                {cropApplying
                  ? '正在裁剪...'
                  : cropMode
                    ? '应用裁剪'
                    : `裁剪影像${file.cropped ? '（已裁剪）' : ''}`}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <i className="ri-information-line"></i>
                提示
              </div>
              <p>请确认影像清晰度和方向正确，如有需要可进行调整。</p>
            </div>
          </div>
        </div>

        <div className="mx-8 border-t border-gray-200"></div>

        <div className="flex justify-end gap-4 px-8 py-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-7 py-3 text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={cropApplying}
            className="rounded-lg bg-blue-600 px-7 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
