interface UseCanvasPointerOptions {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

/**
 * 指针事件分发壳。
 * 入口组件只绑定 pointer handlers，具体逻辑继续下沉到各个交互 hook。
 */
export function useCanvasPointer({
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
}: UseCanvasPointerOptions) {
  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onContextMenu,
  };
}
