'use client';

import type { FormEvent } from 'react';
import { AppDialog } from '@/components/overlay/overlay-components';
import type { ImageFile } from '@/services/imageServices/imageFileService';

interface ImageRenameDialogProps {
  imageFile: ImageFile | null;
  basename: string;
  extension: string;
  error: string | null;
  saving: boolean;
  onBasenameChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ImageRenameDialog({
  imageFile,
  basename,
  extension,
  error,
  saving,
  onBasenameChange,
  onCancel,
  onConfirm,
}: ImageRenameDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AppDialog
      open={Boolean(imageFile)}
      title="重命名影像"
      titleClassName="not-sr-only block text-lg font-semibold text-gray-900"
      bodyClassName="mt-4"
      contentClassName="w-[calc(100vw-2rem)] max-w-md border-gray-200 bg-white p-5 text-gray-900"
      closeOnEscape={!saving}
      onOpenChange={open => {
        if (!open && !saving) onCancel();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-1 text-sm font-medium text-gray-700">原影像名</div>
          <div
            className="break-all rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600"
            title={imageFile?.original_filename}
          >
            {imageFile?.original_filename}
          </div>
        </div>

        <div>
          <label
            htmlFor="image-rename-basename"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            新影像名
          </label>
          <div
            className={`flex overflow-hidden rounded-md border bg-white focus-within:ring-2 ${
              error
                ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
                : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-100'
            }`}
          >
            <input
              id="image-rename-basename"
              type="text"
              required
              autoFocus
              value={basename}
              disabled={saving}
              maxLength={Math.max(1, 255 - extension.length)}
              onChange={event => onBasenameChange(event.target.value)}
              className="min-w-0 flex-1 px-3 py-2 text-sm text-gray-900 outline-none disabled:bg-gray-100"
            />
            {extension && (
              <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                {extension}
              </span>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || !basename.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '保存中...' : '确认'}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}
