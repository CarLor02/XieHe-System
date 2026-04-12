interface CanvasControlsPanelProps {
  imageScale: number;
  contrast: number;
  brightness: number;
  onClearAll: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onDecreaseContrast: () => void;
  onIncreaseContrast: () => void;
  onDecreaseBrightness: () => void;
  onIncreaseBrightness: () => void;
}

/**
 * 右上角控制工具栏。
 */
export default function CanvasControlsPanel({
  imageScale,
  contrast,
  brightness,
  onClearAll,
  onZoomOut,
  onZoomIn,
  onDecreaseContrast,
  onIncreaseContrast,
  onDecreaseBrightness,
  onIncreaseBrightness,
}: CanvasControlsPanelProps) {
  return (
    <div
      className="absolute top-4 right-4 z-10 bg-black/80 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 flex flex-col gap-3 min-w-max"
      onMouseDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onMouseUp={event => event.stopPropagation()}
      onMouseMove={event => event.stopPropagation()}
      onDoubleClick={event => {
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <div className="flex items-center justify-center">
        <button
          onClick={event => {
            event.stopPropagation();
            onClearAll();
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-xs font-medium transition-all active:scale-95 w-full justify-center"
          title="清空所有标注"
        >
          <i className="ri-delete-bin-line"></i>
          <span>清空全部</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-white text-xs whitespace-nowrap">缩放</span>
        <button
          onClick={event => {
            event.stopPropagation();
            onZoomOut();
          }}
          onDoubleClick={event => {
            event.stopPropagation();
            event.preventDefault();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="缩小 (快捷键: -)"
        >
          −
        </button>
        <span className="text-white text-xs font-bold w-8 text-center">
          {Math.round(imageScale * 100)}%
        </span>
        <button
          onClick={event => {
            event.stopPropagation();
            onZoomIn();
          }}
          onDoubleClick={event => {
            event.stopPropagation();
            event.preventDefault();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="放大 (快捷键: +)"
        >
          +
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-white text-xs whitespace-nowrap">对比度</span>
        <button
          onClick={event => {
            event.stopPropagation();
            onDecreaseContrast();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="降低对比度"
        >
          −
        </button>
        <span className="text-white text-xs font-bold w-6 text-center">
          {Math.round(contrast)}
        </span>
        <button
          onClick={event => {
            event.stopPropagation();
            onIncreaseContrast();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="提高对比度"
        >
          +
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-white text-xs whitespace-nowrap">亮度</span>
        <button
          onClick={event => {
            event.stopPropagation();
            onDecreaseBrightness();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="降低亮度"
        >
          −
        </button>
        <span className="text-white text-xs font-bold w-6 text-center">
          {Math.round(brightness)}
        </span>
        <button
          onClick={event => {
            event.stopPropagation();
            onIncreaseBrightness();
          }}
          className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-white text-xs font-bold transition-all active:scale-95"
          title="提高亮度"
        >
          +
        </button>
      </div>
    </div>
  );
}
