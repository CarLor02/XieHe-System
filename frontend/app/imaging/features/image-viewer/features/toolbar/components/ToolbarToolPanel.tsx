'use client';

import { ReactNode, useEffect } from 'react';
import { BasicMode } from '@/app/imaging/features/image-viewer/features/toolbar/components/basic-mode';

export type ToolTab = 'measurement' | 'keypoint';

const TOOL_TABS: { id: ToolTab; label: string; icon: string }[] = [
  { id: 'measurement', label: '测量工具', icon: 'ri-ruler-line' },
  { id: 'keypoint', label: '关键点', icon: 'ri-focus-3-line' },
];

export function getToolTabsForBasicMode(
  currentBasicMode: BasicMode
): { id: ToolTab; label: string; icon: string }[] {
  if (currentBasicMode === BasicMode.VertebraCornerRectify) {
    return TOOL_TABS.filter(tab => tab.id === 'keypoint');
  }
  if (currentBasicMode === BasicMode.MeasurementDerive) {
    return TOOL_TABS.filter(tab => tab.id === 'measurement');
  }
  return TOOL_TABS;
}

export function getEffectiveToolTab(
  currentBasicMode: BasicMode,
  activeToolTab: ToolTab
): ToolTab {
  const visibleTabs = getToolTabsForBasicMode(currentBasicMode);
  return visibleTabs.some(tab => tab.id === activeToolTab)
    ? activeToolTab
    : visibleTabs[0].id;
}

export function shouldShowAuxiliaryTools(currentBasicMode: BasicMode): boolean {
  return currentBasicMode === BasicMode.Move;
}

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
  const visibleTabs = getToolTabsForBasicMode(currentBasicMode);
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
