import { useState } from 'react';

/**
 * 右键菜单与文字编辑弹窗状态。
 */
export function useCanvasContextMenu() {
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    measurementId: null as string | null,
  });
  const [editLabelDialog, setEditLabelDialog] = useState({
    visible: false,
    measurementId: null as string | null,
    currentLabel: '',
  });

  return {
    contextMenu,
    setContextMenu,
    editLabelDialog,
    setEditLabelDialog,
  };
}

