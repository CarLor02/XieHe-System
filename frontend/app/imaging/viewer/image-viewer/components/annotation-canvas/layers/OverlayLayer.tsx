interface OverlayLayerProps {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
  };
  editLabelDialog: {
    visible: boolean;
    currentLabel: string;
  };
  setEditLabelDialog: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      measurementId: string | null;
      currentLabel: string;
    }>
  >;
  onEditLabel: () => void;
  onDeleteShape: () => void;
  onSaveLabel: () => void;
  onCancelEdit: () => void;
}

/**
 * 浮层 UI。
 * 负责右键菜单和文字编辑弹窗，不再由 AnnotationCanvas 直接渲染。
 */
export default function OverlayLayer({
  contextMenu,
  editLabelDialog,
  setEditLabelDialog,
  onEditLabel,
  onDeleteShape,
  onSaveLabel,
  onCancelEdit,
}: OverlayLayerProps) {
  return (
    <>
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
          }}
          className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]"
          onClick={event => event.stopPropagation()}
        >
          <button
            onClick={onEditLabel}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          >
            <span>✏️</span>
            <span>编辑文字</span>
          </button>
          <button
            onClick={onDeleteShape}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
          >
            <span>🗑️</span>
            <span>删除图形</span>
          </button>
        </div>
      )}

      {editLabelDialog.visible && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          onClick={onCancelEdit}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 shadow-2xl border border-gray-300"
            onClick={event => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">编辑图形文字</h3>
            <input
              type="text"
              value={editLabelDialog.currentLabel}
              onChange={event =>
                setEditLabelDialog(previous => ({
                  ...previous,
                  currentLabel: event.target.value,
                }))
              }
              onKeyDown={event => {
                if (event.key === 'Enter') onSaveLabel();
                if (event.key === 'Escape') onCancelEdit();
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入文字标注..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={onSaveLabel}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
