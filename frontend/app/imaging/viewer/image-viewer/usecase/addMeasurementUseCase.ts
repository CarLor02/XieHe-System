import {ImageSize, MeasurementData, Point, Tool} from "@/app/imaging/viewer/image-viewer/types";
import {
    calculateMeasurementValue as calcMeasurementValue
} from "@/app/imaging/viewer/image-viewer/domain/annotation-calculation";
import {getDescriptionForType as getDesc} from "@/app/imaging/viewer/image-viewer/domain/annotation-metadata";
import {getInheritedPoints} from "@/app/imaging/viewer/image-viewer/domain/annotation-inheritance";
import {getAnnotationTypeId} from "@/app/imaging/viewer/image-viewer/catalog/shared/annotation-config";
import {
    hasAnnotationForTool,
    hasUniqueAnnotationForTool,
    measurementMatchesTool,
} from "@/app/imaging/viewer/image-viewer/domain/annotation-uniqueness";
import {S1_BINDING_POINT_MAP} from "@/app/imaging/viewer/image-viewer/domain/annotation-binding";
import {Dispatch, SetStateAction} from "react";

/**
 * 当某个 S1 相关测量被替换时，将新测量的 S1 端点坐标同步到其他所有 S1 相关测量中。
 * 这样即使用户重新标注了骶骨线，其他测量（PI/PT/SVA等）的 S1 点也会立即跟随，
 * 不需要等到下次拖动才通过绑定传播。
 */
function syncS1PointsAfterReplace(
    measurements: MeasurementData[],
    newMeasurement: MeasurementData,
    context: { standardDistance: number | null; standardDistancePoints: Point[]; imageNaturalSize: ImageSize }
): MeasurementData[] {
    const sourceTypeId = getAnnotationTypeId(newMeasurement.type);
    const sourceMap = S1_BINDING_POINT_MAP[sourceTypeId];
    if (!sourceMap) return measurements;

    return measurements.map(m => {
        if (m.id === newMeasurement.id) return m;
        const mTypeId = getAnnotationTypeId(m.type);
        const targetMap = S1_BINDING_POINT_MAP[mTypeId];
        if (!targetMap) return m;

        const newPoints = [...m.points];
        let changed = false;

        // 同步 S1 左端点
        if (sourceMap.left !== null && targetMap.left !== null &&
            sourceMap.left < newMeasurement.points.length &&
            targetMap.left < newPoints.length) {
            newPoints[targetMap.left] = {...newMeasurement.points[sourceMap.left]};
            changed = true;
        }

        // 同步 S1 右端点
        if (sourceMap.right !== null && targetMap.right !== null &&
            sourceMap.right < newMeasurement.points.length &&
            targetMap.right < newPoints.length) {
            newPoints[targetMap.right] = {...newMeasurement.points[sourceMap.right]};
            changed = true;
        }

        if (!changed) return m;
        return {
            ...m,
            points: newPoints,
            value: calcMeasurementValue(mTypeId, newPoints, context) || m.value,
        };
    });
}

export function addMeasurement(
    type: string,
    points: Point[] = [],
    measurements: MeasurementData[],
    setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>,
    tools: Tool[],
    standardDistance: number | null,
    standardDistancePoints: Point[],
    imageNaturalSize: ImageSize,
    /** 替换模式：当同类型测量已存在时，用新测量替换旧测量（而非拦截）。非Admin 用户应传 true。 */
    allowReplace = false
){
    // 如果是Cobb工具，自动编号（统一处理 'cobb' 和 'Cobb'）
    const requestedToolId = getAnnotationTypeId(type);
    let finalType = requestedToolId;
    const isCobb = requestedToolId === 'cobb';
    if (isCobb) {
        const cobbCount = measurements.filter(m =>
            /^cobb\d+$/i.test(m.type)
        ).length;
        finalType = `cobb${cobbCount + 1}`;
    }

    const configLookupType = isCobb ? 'cobb' : finalType;

    // 使用统一的配置系统计算测量值
    const defaultValue =
        calcMeasurementValue(configLookupType, points, {
            standardDistance,
            standardDistancePoints,
            imageNaturalSize,
        }) || '0.0°';
    const description = isCobb ? 'Cobb角测量' : getDesc(configLookupType);

    const newMeasurement: MeasurementData = {
        id: Date.now().toString(),
        type: finalType, // 使用编号后的类型（Cobb1, Cobb2, Cobb3...）
        value: defaultValue,
        points: points,
        description,
    };

    setMeasurements(prev => {
        const currentTool = tools.find(t => t.id === configLookupType);
        if (currentTool && hasUniqueAnnotationForTool(prev, currentTool)) {
            if (!allowReplace) {
                // Admin 模式：同类型已存在则拦截（由 AI 检测统一管理）
                return prev;
            }
            // 替换模式：过滤掉旧的同类型测量，加入新测量
            const withoutOld = prev.filter(
                m => !measurementMatchesTool(m, currentTool)
            );
            const afterReplace = [...withoutOld, newMeasurement];
            // 立即将新测量的 S1 端点坐标同步到其他 S1 相关测量（PI/PT/SVA/TPA等），
            // 避免重新标注骶骨线后相关测量的 S1 点坐标残留旧位置。
            return syncS1PointsAfterReplace(afterReplace, newMeasurement, {
                standardDistance,
                standardDistancePoints,
                imageNaturalSize,
            });
        }

        // 将本次新增标注加入列表
        const accumulated: MeasurementData[] = [...prev, newMeasurement];

        // 检查是否有其他工具的全部点位均可由继承/共享获得，若是则自动创建对应标注
        for (const tool of tools) {
            if (!tool.pointsNeeded || tool.pointsNeeded <= 0) continue;
            // 已存在该类型的标注则跳过；唯一性工具同时兼容显示名与历史别名。
            if (hasAnnotationForTool(accumulated, tool)) continue;

            const { points: inheritedPts, count } = getInheritedPoints(
                tool.id,
                accumulated
            );
            if (count >= tool.pointsNeeded) {
                // 所有点位均可由已有标注推导出，自动创建
                const autoPoints = inheritedPts.slice(0, tool.pointsNeeded);
                const autoValue =
                    calcMeasurementValue(tool.id, autoPoints, {
                        standardDistance,
                        standardDistancePoints,
                        imageNaturalSize,
                    }) || '0.0°';
                const autoMeasurement: MeasurementData = {
                    id: `${Date.now()}-auto-${tool.id}-${accumulated.length}`,
                    type: tool.id,
                    value: autoValue,
                    points: autoPoints,
                    description: getDesc(tool.id),
                };
                // 立即追加到 accumulated，以便后续工具可以从本次自动创建的标注中继续推导
                accumulated.push(autoMeasurement);
            }
        }

        return accumulated;
    });
}
