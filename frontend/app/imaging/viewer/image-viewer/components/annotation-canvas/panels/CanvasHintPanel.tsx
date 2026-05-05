import { MeasurementData, Tool } from '../../../types';
import { buildInheritedPointMap } from '../../../domain/annotation-inheritance';
import { getManualKeypointPointSlots } from '../../../domain/keypoint-measurement-binding';
import { KeypointAnnotation } from '../../../domain/keypoint-state';

interface CanvasHintPanelProps {
  selectedTool: string;
  examType: string;
  isImagePanLocked: boolean;
  isHovering: boolean;
  clickedPointsCount: number;
  pointsNeeded: number;
  currentTool: Tool | null;
  measurements: MeasurementData[];
  keypoints: KeypointAnnotation[];
  pendingManualVertebraCenter?: string | null;
}

/**
 * 底部操作提示面板。
 */
export default function CanvasHintPanel({
  selectedTool,
  examType,
  isImagePanLocked,
  isHovering,
  clickedPointsCount,
  pointsNeeded,
  currentTool,
  measurements,
  keypoints,
  pendingManualVertebraCenter = null,
}: CanvasHintPanelProps) {
  const slotCount = currentTool?.pointsNeeded ?? pointsNeeded;
  const inheritedSlotMap = currentTool
    ? buildInheritedPointMap(currentTool.id, measurements)
    : new Map<number, { x: number; y: number }>();
  const keypointSlotMap = currentTool
    ? getManualKeypointPointSlots(keypoints, currentTool.id, examType)
    : new Map<number, { x: number; y: number }>();
  const reusedSlotIndices = Array.from(
    new Set([...inheritedSlotMap.keys(), ...keypointSlotMap.keys()])
  ).sort((left, right) => left - right);
  const unfilledSlotIndices = Array.from({ length: slotCount }, (_, index) => index)
    .filter(index => !reusedSlotIndices.includes(index));
  const clickedSlotIndices = unfilledSlotIndices.slice(0, clickedPointsCount);
  const pendingSlotIndices = unfilledSlotIndices.slice(clickedPointsCount);
  const formatSlots = (indices: number[]) =>
    indices.map(index => `${index + 1}`).join('、');
  const inheritanceHint =
    currentTool &&
    selectedTool !== 'hand' &&
    reusedSlotIndices.length > 0 ? (
      <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed">
        <p className="text-cyan-300">
          已复用第 {formatSlots(reusedSlotIndices)} 点
        </p>
        {clickedSlotIndices.length > 0 && (
          <p className="text-gray-300">
            已手动标注第 {formatSlots(clickedSlotIndices)} 点
          </p>
        )}
        {pendingSlotIndices.length > 0 && (
          <p className="text-yellow-300">
            下一步标注第 {pendingSlotIndices[0] + 1} 点
            {pendingSlotIndices.length > 1
              ? `，剩余第 ${formatSlots(pendingSlotIndices)} 点`
              : ''}
          </p>
        )}
      </div>
    ) : null;

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 max-w-md">
      {selectedTool.toLowerCase() === 'cobb' && (
        <div className="bg-black/75 border border-yellow-400/40 text-white text-xs px-3 py-2 rounded">
          <p className="font-medium text-yellow-300">Cobb 点位顺序提示</p>
          <p className="mt-1">
            1 上端椎左 | 2 上端椎右 | 3 下端椎左 | 4 下端椎右
          </p>
        </div>
      )}

      <div className="bg-black/70 text-white text-xs px-3 py-2 rounded">
        {selectedTool === 'hand' ? (
          <div>
            <p className="font-medium">
              移动模式{' '}
              {isImagePanLocked && (
                <span className="text-yellow-400">🔒 图像已锁定</span>
              )}
            </p>
            <p>点击选中标注 | 拖拽移动 | 点击删除按钮删除</p>
            <p className="text-gray-400 mt-1">
              {isImagePanLocked
                ? '图像已锁定，拖拽不会移动图像'
                : '或拖拽移动图像'}{' '}
              | 滚轮缩放
            </p>
          </div>
        ) : selectedTool === 'polygon' ? (
          <div>
            <p className="font-medium">多边形标注模式</p>
            <p>已标注 {clickedPointsCount} 个点</p>
            {clickedPointsCount < 3 ? (
              <p className="text-yellow-400 mt-1">至少需要3个点</p>
            ) : (
              <div className="text-green-400 mt-1">
                <p>点击回第一个点自动闭合</p>
                <p>Alt+Z 撤销点</p>
              </div>
            )}
          </div>
        ) : selectedTool === 'vertebra-center' ? (
          <div>
            <p className="font-medium">椎体中心标注模式</p>
            <p>已标注 {clickedPointsCount}/4 个角点</p>
            {pendingManualVertebraCenter && (
              <p className="text-cyan-300 mt-1">
                当前椎体：{pendingManualVertebraCenter}，按{' '}
                {pendingManualVertebraCenter}-1、{pendingManualVertebraCenter}-2、
                {pendingManualVertebraCenter}-3、{pendingManualVertebraCenter}-4
                标注
              </p>
            )}
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">
                点击{pendingManualVertebraCenter ? `${pendingManualVertebraCenter}-1` : '第1个角点'}
              </p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">
                点击{pendingManualVertebraCenter ? `${pendingManualVertebraCenter}-2` : '第2个角点'}
              </p>
            )}
            {clickedPointsCount === 2 && (
              <p className="text-yellow-400 mt-1">
                点击{pendingManualVertebraCenter ? `${pendingManualVertebraCenter}-3` : '第3个角点'}
              </p>
            )}
            {clickedPointsCount === 3 && (
              <div className="text-green-400 mt-1">
                <p>
                  点击{pendingManualVertebraCenter ? `${pendingManualVertebraCenter}-4` : '第4个角点'}完成标注
                </p>
                <p>中心点将自动计算</p>
              </div>
            )}
          </div>
        ) : selectedTool === 'aux-length' ? (
          <div>
            <p className="font-medium">距离标注模式</p>
            <p>已标注 {clickedPointsCount}/2 个点</p>
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击起点</p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">点击终点完成测量</p>
            )}
            {clickedPointsCount === 2 && (
              <p className="text-green-400 mt-1">
                距离已计算（根据标准距离换算）
              </p>
            )}
          </div>
        ) : selectedTool === 'aux-horizontal-line' ? (
          <div>
            <p className="font-medium">辅助水平线段模式</p>
            <p>已标注 {clickedPointsCount}/2 个点</p>
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击第1个点</p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">
                点击第2个点（自动保持水平）
              </p>
            )}
          </div>
        ) : selectedTool === 'aux-vertical-line' ? (
          <div>
            <p className="font-medium">辅助垂直线段模式</p>
            <p>已标注 {clickedPointsCount}/2 个点</p>
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击第1个点</p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">
                点击第2个点（自动保持垂直）
              </p>
            )}
          </div>
        ) : selectedTool === 'aux-angle' ? (
          <div>
            <p className="font-medium">角度标注模式（两条线段）</p>
            <p>已标注 {clickedPointsCount}/4 个点</p>
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击第一条线段的起点</p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">点击第一条线段的终点</p>
            )}
            {clickedPointsCount === 2 && (
              <p className="text-yellow-400 mt-1">点击第二条线段的起点</p>
            )}
            {clickedPointsCount === 3 && (
              <p className="text-yellow-400 mt-1">
                点击第二条线段的终点完成测量
              </p>
            )}
            {clickedPointsCount === 4 && (
              <p className="text-green-400 mt-1">角度已计算</p>
            )}
          </div>
        ) : selectedTool.includes('t1-tilt') ? (
          <div>
            <p className="font-medium">T1 Tilt 测量模式</p>
            <p>已标注 {clickedPointsCount}/{pointsNeeded} 个点</p>
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击T1椎体上终板起点</p>
            )}
            {clickedPointsCount === 1 && clickedPointsCount < pointsNeeded && (
              <>
                <p className="text-green-400 mt-1">水平参考线已显示</p>
                <p className="text-yellow-400 mt-1">点击上终板终点完成测量</p>
              </>
            )}
            {pointsNeeded > 0 && clickedPointsCount === pointsNeeded && (
              <p className="text-green-400 mt-1">T1 Tilt角度已计算</p>
            )}
          </div>
        ) : (
          <div>
            <p className="font-medium">测量模式: {currentTool?.name}</p>
            <p>
              已标注 {clickedPointsCount}/{pointsNeeded} 个点
              {reusedSlotIndices.length > 0 && (
                <span className="text-cyan-400 ml-2 text-xs">
                  (+{reusedSlotIndices.length} 个点已复用)
                </span>
              )}
            </p>
            {clickedPointsCount < pointsNeeded && (
              <p className="text-yellow-400 mt-1">点击图像标注关键点</p>
            )}
          </div>
        )}
        {inheritanceHint}
        {isHovering && <p className="text-blue-400 mt-1">滚轮缩放已激活</p>}
      </div>
    </div>
  );
}
