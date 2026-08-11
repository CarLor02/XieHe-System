'use client';

import { ReactNode, useEffect } from 'react';
import {
  getEffectiveToolTab,
  getToolTabsForBasicMode,
  type BasicMode,
  type ToolTab,
} from '@xiehe/imaging-core/editor';
import { getToolTabCopy } from '@xiehe/imaging-catalog/tools';

export type { ToolTab } from '@xiehe/imaging-core/editor';

interface ToolbarToolPanelProps {
  currentBasicMode: BasicMode;
  activeToolTab: ToolTab;
  onToolTabChange: (tab: ToolTab) => void;
  children: ReactNode;
}

export default function ToolbarToolPanel({
  currentBasicMode,
  activeToolTab,
  onToolTabChange,
  children,
}: ToolbarToolPanelProps) {
  const visibleTabs = getToolTabsForBasicMode(currentBasicMode).map(
    getToolTabCopy
  );
  const effectiveToolTab = getEffectiveToolTab(currentBasicMode, activeToolTab);

  useEffect(() => {
    if (effectiveToolTab !== activeToolTab) {
      onToolTabChange(effectiveToolTab);
    }
  }, [activeToolTab, effectiveToolTab, onToolTabChange]);

  return (
    <div className="mb-4" data-current-basic-mode={currentBasicMode}>
      <div
        className={`grid gap-1 rounded-lg bg-gray-900/70 p-1 mb-3 ${
          visibleTabs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        }`}
      >
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onToolTabChange(tab.id)}
            className={`h-9 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${
              effectiveToolTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <i className={`${tab.icon} text-sm`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {children}
    </div>
  );
}
