import {
  KeypointSequenceSession,
  Tool,
} from '@/app/imaging/features/image-viewer/shared/types';
import {
  type AvtPlacementSession,
} from '@xiehe/imaging-core/contracts';
import {
  getAvtTargetLabel,
} from '@xiehe/imaging-core/measurements/ap';
import {
  getPelvicToolPointCount,
  getPelvicToolPointLabels,
  type PelvicPlacementSession,
} from '@/app/imaging/features/image-viewer/features/measurements/manual-tools/domain/lateral/pelvic';
import {
  getManualMeasurementInheritedPoints,
  getNextManualMeasurementPointIndex,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/manualMeasurementKeypointInheritanceUseCase';
import {
  getNextPelvicPlacementPointIndex,
  getPelvicPlacementInheritedPointMap,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/application/usecases/pelvicMeasurementPlacementUseCase';
import type { MeasurementData } from '@xiehe/imaging-core/contracts';
import {
  getMeasurementKeypointBindingRuleForMeasurement,
  getMeasurementKeypointDrawingHint,
} from '@/app/imaging/features/image-viewer/features/measurement-keypoint-sync/domain/measurement-keypoint-binding';
import type { KeypointAnnotation } from '@/app/imaging/features/image-viewer/features/keypoints';

interface CanvasHintPanelProps {
  selectedTool: string;
  isImagePanLocked: boolean;
  isHovering: boolean;
  clickedPointsCount: number;
  pointsNeeded: number;
  currentTool: Tool | null;
  keypoints: KeypointAnnotation[];
  keypointSequenceSession?: KeypointSequenceSession | null;
  avtPlacementSession?: AvtPlacementSession | null;
  pelvicPlacementSession?: PelvicPlacementSession | null;
  measurements?: MeasurementData[];
}

/**
 * 底部操作提示面板。
 */
export default function CanvasHintPanel({
  selectedTool,
  isImagePanLocked,
  isHovering,
  clickedPointsCount,
  pointsNeeded,
  currentTool,
  keypoints,
  keypointSequenceSession = null,
  avtPlacementSession = null,
  pelvicPlacementSession = null,
  measurements = [],
}: CanvasHintPanelProps) {
  const currentSequenceKeypoint =
    keypointSequenceSession?.keypointIds[keypointSequenceSession.currentIndex];
  const completedSequenceCount = keypointSequenceSession?.currentIndex ?? 0;
  const sequenceTotal = keypointSequenceSession?.keypointIds.length ?? 0;
  const hasFh1 = keypoints.some(keypoint => keypoint.id === 'FH-1');
  const hasFh2 = keypoints.some(keypoint => keypoint.id === 'FH-2');
  const tpaBindingRule =
    currentTool?.id === 'tpa' && hasFh1 === hasFh2
      ? getMeasurementKeypointBindingRuleForMeasurement({
          id: 'canvas-hint-tpa-binding-probe',
          type: 'tpa',
          value: '',
          points: [],
          pelvicMetadata: {
            schemaVersion: 2,
            femoralHeadMode: hasFh1 ? 'bilateral' : 'single',
          },
        })
      : null;
  const tpaInheritedPointMap = tpaBindingRule
    ? tpaBindingRule.getAvailableMeasurementPointMap(
        new Map(keypoints.map(keypoint => [keypoint.id, keypoint]))
      )
    : null;
  const nextTpaPointIndex = tpaInheritedPointMap
    ? Array.from(
        { length: currentTool?.pointsNeeded ?? 0 },
        (_, pointIndex) => pointIndex
      ).filter(pointIndex => !tpaInheritedPointMap.has(pointIndex))[
        clickedPointsCount
      ] ?? null
    : null;
  const nextMeasurementPointIndex = tpaBindingRule
    ? nextTpaPointIndex
    : currentTool
      ? getNextManualMeasurementPointIndex(
          currentTool.id,
          keypoints,
          currentTool.pointsNeeded,
          clickedPointsCount
        )
      : null;
  const measurementKeypointHint =
    currentTool && nextMeasurementPointIndex !== null
      ? (tpaBindingRule?.getDrawingHint?.(nextMeasurementPointIndex) ??
        getMeasurementKeypointDrawingHint(
          currentTool.id,
          nextMeasurementPointIndex
        ))
      : null;
  const inheritedPointCount = tpaInheritedPointMap
    ? tpaInheritedPointMap.size
    : currentTool
      ? getManualMeasurementInheritedPoints(
          currentTool.id,
          currentTool.pointsNeeded,
          keypoints
        ).count
      : 0;
  const completedMeasurementPointCount =
    clickedPointsCount + inheritedPointCount;
  const totalMeasurementPointCount = currentTool?.pointsNeeded ?? pointsNeeded;
  const pelvicInherited = pelvicPlacementSession
    ? getPelvicPlacementInheritedPointMap({
        toolId: pelvicPlacementSession.toolId,
        mode: pelvicPlacementSession.mode,
        keypoints,
        measurements,
      })
    : new Map();
  const pelvicNextPointIndex = pelvicPlacementSession
    ? getNextPelvicPlacementPointIndex(
        pelvicPlacementSession.toolId,
        pelvicPlacementSession.mode,
        pelvicInherited,
        clickedPointsCount
      )
    : null;
  const pelvicTotal = pelvicPlacementSession
    ? getPelvicToolPointCount(
        pelvicPlacementSession.toolId,
        pelvicPlacementSession.mode
      )
    : 0;
  const pelvicLabels =
    pelvicPlacementSession
      ? getPelvicToolPointLabels(
          pelvicPlacementSession.toolId,
          pelvicPlacementSession.mode
        )
      : [];

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
        {pelvicPlacementSession ? (
          <div>
            <p className="font-medium text-yellow-300">
              正在标注 {pelvicPlacementSession.toolId.toUpperCase()}（
              {pelvicPlacementSession.mode === 'bilateral' ? '双FH' : '单FH'}）
            </p>
            <p className="mt-1">
              {pelvicNextPointIndex === null
                ? '所需点已完整，点击画布完成恢复'
                : `下一点 ${pelvicLabels[pelvicNextPointIndex]}`}
              ，已标注 {clickedPointsCount + pelvicInherited.size}/{pelvicTotal}{' '}
              个点
            </p>
            <p className="text-gray-300 mt-1">按 Esc 取消</p>
          </div>
        ) : avtPlacementSession ? (
          <div>
            {avtPlacementSession.step.kind === 'keypoint' ? (
              <>
                <p className="font-medium text-yellow-300">
                  正在补充 {avtPlacementSession.step.label}：下一点{' '}
                  {avtPlacementSession.step.keypointId}，已标注{' '}
                  {avtPlacementSession.step.completedCount}/
                  {avtPlacementSession.step.totalCount} 个点
                </p>
                <p className="text-gray-300 mt-1">按 Esc 取消剩余补点</p>
              </>
            ) : (
              <>
                <p className="font-medium text-yellow-300">
                  正在标注椎间盘 AVT(
                  {getAvtTargetLabel(avtPlacementSession.target)})
                </p>
                <p className="mt-1">
                  {clickedPointsCount === 0
                    ? '点击椎间盘横线的第一个端点，已标注 0/2 个点'
                    : '点击第二个端点，系统将自动保持水平，已标注 1/2 个点'}
                </p>
                <p className="text-gray-300 mt-1">按 Esc 取消</p>
              </>
            )}
          </div>
        ) : keypointSequenceSession && currentSequenceKeypoint ? (
          <div>
            <p className="font-medium text-yellow-300">
              正在补充 {keypointSequenceSession.groupName}：下一点{' '}
              {currentSequenceKeypoint}，已完成 {completedSequenceCount}/
              {sequenceTotal}
            </p>
            <p className="text-gray-300 mt-1">按 Esc 取消剩余补点</p>
          </div>
        ) : selectedTool === 'hand' ? (
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
            {clickedPointsCount === 0 && (
              <p className="text-yellow-400 mt-1">点击第1个角点</p>
            )}
            {clickedPointsCount === 1 && (
              <p className="text-yellow-400 mt-1">点击第2个角点</p>
            )}
            {clickedPointsCount === 2 && (
              <p className="text-yellow-400 mt-1">点击第3个角点</p>
            )}
            {clickedPointsCount === 3 && (
              <div className="text-green-400 mt-1">
                <p>点击第4个角点完成标注</p>
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
            <p>
              已标注 {completedMeasurementPointCount}/
              {totalMeasurementPointCount} 个点
            </p>
            {clickedPointsCount < pointsNeeded && (
              <p className="text-yellow-400 mt-1">
                {measurementKeypointHint ?? '点击T1椎体上终板起点'}
              </p>
            )}
            {clickedPointsCount === 1 && pointsNeeded > 1 && (
              <>
                <p className="text-green-400 mt-1">水平参考线已显示</p>
                <p className="text-yellow-400 mt-1">点击上终板终点完成测量</p>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="font-medium">测量模式: {currentTool?.name}</p>
            <p>
              已标注 {completedMeasurementPointCount}/
              {totalMeasurementPointCount} 个点
              {inheritedPointCount > 0 && (
                <span className="text-cyan-400 ml-2 text-xs">
                  (+{inheritedPointCount} 个点已自动继承)
                </span>
              )}
            </p>
            {clickedPointsCount < pointsNeeded && (
              <p className="text-yellow-400 mt-1">
                {measurementKeypointHint ?? '点击图像标注关键点'}
              </p>
            )}
          </div>
        )}
        {isHovering && <p className="text-blue-400 mt-1">滚轮缩放已激活</p>}
      </div>
    </div>
  );
}
