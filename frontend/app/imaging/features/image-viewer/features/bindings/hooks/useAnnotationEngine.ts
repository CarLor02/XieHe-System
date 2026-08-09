import { useMemo, useState } from 'react';
import {
  AnnotationBindings,
  createManualPointRef,
  PointRef,
  PointSyncGroup,
  createEmptyBindings,
  getMeasurementLayoutFingerprint,
  getSyncGroupsForPoint,
  ManualPointRef,
  validateAnnotationBindings,
} from '@/app/imaging/features/image-viewer/features/bindings/domain/annotation-binding';
import { MeasurementData, Point } from '@xiehe/imaging-core/contracts';

/** 用户手动点位绑定的状态与交互编排。 */
interface UseAnnotationEngineOptions {
  measurements: MeasurementData[];
  setMeasurements: React.Dispatch<React.SetStateAction<MeasurementData[]>>;
}

export function useAnnotationEngine({
  measurements,
  setMeasurements,
}: UseAnnotationEngineOptions) {
  const [storedPointBindings, setPointBindings] = useState<AnnotationBindings>(
    createEmptyBindings()
  );
  const [selectedBindingGroupId, setSelectedBindingGroupId] = useState<
    string | null
  >(null);
  const [isBindingPanelOpen, setIsBindingPanelOpen] = useState(false);
  const [centerOnPoint, setCenterOnPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isManualBindingMode, setIsManualBindingMode] = useState(false);
  const [manualBindingSelectedPoints, setManualBindingSelectedPoints] =
    useState<PointRef[]>([]);

  const measurementStructureKey = useMemo(
    () =>
      measurements
        .map(
          measurement =>
            `${measurement.id}:${getMeasurementLayoutFingerprint(measurement)}`
        )
        .join('|'),
    [measurements]
  );

  // 自动医学同步由 measurement-keypoint-sync 负责；此处只暴露与当前布局
  // 匹配的用户手动绑定，布局变化后旧原始下标不会继续参与拖拽传播。
  const pointBindings = useMemo(
    () => validateAnnotationBindings(storedPointBindings, measurements),
    // measurementStructureKey 已包含所有会改变点位语义的布局信息，坐标拖动
    // 不需要重复执行结构校验。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measurementStructureKey, storedPointBindings]
  );

  const clearBindings = () => {
    setPointBindings(createEmptyBindings());
  };

  const removeBindingGroup = (groupId: string) => {
    setPointBindings({
      ...pointBindings,
      syncGroups: pointBindings.syncGroups.filter(group => group.id !== groupId),
    });
    if (selectedBindingGroupId === groupId) {
      setSelectedBindingGroupId(null);
    }
  };

  const removeBindingMember = (
    groupId: string,
    annotationId: string,
    pointIndex: number
  ) => {
    setPointBindings({
      ...pointBindings,
      syncGroups: pointBindings.syncGroups
        .map(group => {
          if (group.id !== groupId) return group;
          return {
            ...group,
            members: group.members.filter(
              member =>
                !(
                  member.annotationId === annotationId &&
                  member.pointIndex === pointIndex
                )
            ),
          };
        })
        .filter(group => group.members.length >= 2),
    });
  };

  const toggleManualBindingPoint = (
    annotationId: string,
    pointIndex: number
  ) => {
    setManualBindingSelectedPoints(previousPoints => {
      const exists = previousPoints.some(
        point =>
          point.annotationId === annotationId && point.pointIndex === pointIndex
      );
      if (exists) {
        return previousPoints.filter(
          point =>
            !(
              point.annotationId === annotationId &&
              point.pointIndex === pointIndex
            )
        );
      }
      return [...previousPoints, { annotationId, pointIndex }];
    });
  };

  const completeManualBinding = () => {
    if (manualBindingSelectedPoints.length >= 2) {
      const involvedGroupIds = new Set<string>();

      for (const point of manualBindingSelectedPoints) {
        getSyncGroupsForPoint(
          point.annotationId,
          point.pointIndex,
          pointBindings
        ).forEach(group => involvedGroupIds.add(group.id));
      }

      const mergedMembersMap = new Map<string, ManualPointRef>();
      for (const group of pointBindings.syncGroups) {
        if (involvedGroupIds.has(group.id)) {
          group.members.forEach(member =>
            mergedMembersMap.set(
              `${member.annotationId}:${member.pointIndex}`,
              member
            )
          );
        }
      }
      manualBindingSelectedPoints.forEach(point => {
        const measurement = measurements.find(
          item => item.id === point.annotationId
        );
        const manualPoint = measurement
          ? createManualPointRef(measurement, point.pointIndex)
          : null;
        if (manualPoint) {
          mergedMembersMap.set(
            `${manualPoint.annotationId}:${manualPoint.pointIndex}`,
            manualPoint
          );
        }
      });

      const allMembers = Array.from(mergedMembersMap.values());
      if (allMembers.length >= 2) {
        const newGroup: PointSyncGroup = {
          id: `manual-${Date.now()}`,
          name: `手动绑定组 ${
            pointBindings.syncGroups.length + 1
          }`,
          color: '#22d3ee',
          source: 'manual',
          members: allMembers,
        };

        setPointBindings({
          ...pointBindings,
          syncGroups: [
            ...pointBindings.syncGroups.filter(
              group => !involvedGroupIds.has(group.id)
            ),
            newGroup,
          ],
        });

        const anchor =
          manualBindingSelectedPoints[manualBindingSelectedPoints.length - 1];
        const anchorMeasurement = measurements.find(
          measurement => measurement.id === anchor.annotationId
        );
        const anchorPoint = anchorMeasurement?.points[anchor.pointIndex];

        if (anchorPoint) {
          setMeasurements(previousMeasurements =>
            previousMeasurements.map(measurement => {
              const affected = allMembers.filter(
                member =>
                  member.annotationId === measurement.id &&
                  !(
                    member.annotationId === anchor.annotationId &&
                    member.pointIndex === anchor.pointIndex
                  )
              );
              if (affected.length === 0) return measurement;

              const newPoints = [...measurement.points];
              for (const member of affected) {
                newPoints[member.pointIndex] = { ...anchorPoint } as Point;
              }
              return { ...measurement, points: newPoints };
            })
          );
        }
      }
    }

    setIsManualBindingMode(false);
    setManualBindingSelectedPoints([]);
  };

  const cancelManualBinding = () => {
    setIsManualBindingMode(false);
    setManualBindingSelectedPoints([]);
  };

  return {
    pointBindings,
    setPointBindings,
    selectedBindingGroupId,
    setSelectedBindingGroupId,
    isBindingPanelOpen,
    setIsBindingPanelOpen,
    centerOnPoint,
    setCenterOnPoint,
    isManualBindingMode,
    setIsManualBindingMode,
    manualBindingSelectedPoints,
    setManualBindingSelectedPoints,
    clearBindings,
    removeBindingGroup,
    removeBindingMember,
    toggleManualBindingPoint,
    completeManualBinding,
    cancelManualBinding,
  };
}
