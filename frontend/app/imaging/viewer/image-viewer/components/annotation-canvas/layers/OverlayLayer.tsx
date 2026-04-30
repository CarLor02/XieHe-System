interface OverlayLayerProps {
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
  onSaveLabel: () => void;
  onCancelEdit: () => void;
}

/**
 * 浮层 UI。仅承载文字编辑弹窗；删除走面板，重命名通过面板内联编辑或右键直接打开此弹窗。
 */
export default function OverlayLayer({
  editLabelDialog,
  setEditLabelDialog,
  onSaveLabel,
  onCancelEdit,
}: OverlayLayerProps) {
  return (
    <>
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
