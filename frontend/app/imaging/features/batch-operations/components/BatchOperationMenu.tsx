'use client';

import { useState } from 'react';
import AppDropdown from '@/components/common/AppDropdown';
import type {
  BatchOperation,
  BatchSelectionMode,
} from '../domain/batch-operation';

interface BatchOperationMenuProps {
  activeMode: BatchSelectionMode | null;
  disabled?: boolean;
  onSelect: (operation: BatchOperation) => void;
}

const OPERATIONS: Array<{
  value: BatchOperation;
  label: string;
  iconClassName: string;
}> = [
  { value: 'import', label: '批量导入', iconClassName: 'ri-folder-upload-line' },
  { value: 'export', label: '批量导出', iconClassName: 'ri-download-line' },
  { value: 'set-exam-type', label: '批量设置类型', iconClassName: 'ri-edit-2-line' },
];

export default function BatchOperationMenu({
  activeMode,
  disabled = false,
  onSelect,
}: BatchOperationMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (operation: BatchOperation) => {
    setOpen(false);
    onSelect(operation);
  };

  return (
    <AppDropdown
      open={open}
      onOpenChange={setOpen}
      align="end"
      sideOffset={4}
      contentClassName="w-44 py-1"
      trigger={
        <button
          type="button"
          aria-label="批量操作"
          disabled={disabled}
          className={`inline-flex items-center whitespace-nowrap rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            activeMode
              ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <i className="ri-stack-line mr-1" />
          批量操作
          <i className="ri-arrow-down-s-line ml-1" />
        </button>
      }
    >
      {OPERATIONS.map(operation => (
        <button
          key={operation.value}
          type="button"
          onClick={() => handleSelect(operation.value)}
          className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-gray-100 ${
            activeMode === operation.value
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700'
          }`}
        >
          <i className={`${operation.iconClassName} mr-2`} />
          {operation.label}
        </button>
      ))}
    </AppDropdown>
  );
}
