import {ImageSize, MeasurementData, Point, Tool} from "@/app/imaging/viewer/image-viewer/types";
import {
    calculateMeasurementValue as calcMeasurementValue
} from "@/app/imaging/viewer/image-viewer/domain/annotation-calculation";
import {getDescriptionForType as getDesc} from "@/app/imaging/viewer/image-viewer/domain/annotation-metadata";
import {getInheritedPoints} from "@/app/imaging/viewer/image-viewer/domain/annotation-inheritance";
import {Dispatch, SetStateAction} from "react";

export function addMeasurement(
    type: string,
    points: Point[] = [],
    measurements: MeasurementData[],
    setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>,
    tools: Tool[],
    standardDistance: number | null,
    standardDistancePoints: Point[],
    imageNaturalSize: ImageSize
){
    // 如果是Cobb工具，自动编号（统一处理 'cobb' 和 'Cobb'）
    let finalType = type;
    const isCobb = type.toLowerCase() === 'cobb';
    if (isCobb) {
        const cobbCount = measurements.filter(m =>
            m.type.startsWith('Cobb')
        ).length;
        finalType = `Cobb${cobbCount + 1}`;
    }

    // 查找工具ID用于配置查找
    // 优先使用工具对象的ID，如果是Cobb则使用'cobb'，否则通过名称反查ID
    let configLookupType = finalType;
    if (isCobb) {
        configLookupType = 'cobb';
    } else {
        const tool = tools.find(t => t.name === type);
        if (tool) {
            configLookupType = tool.id;
        }
    }

    // 使用统一的配置系统计算测量值
    const defaultValue =
        calcMeasurementValue(configLookupType, points, {
            standardDistance,
            standardDistancePoints,
            imageNaturalSize,
        }) || '0.0°';
    const description = isCobb ? 'Cobb角测量' : getDesc(finalType);

    const newMeasurement: MeasurementData = {
        id: Date.now().toString(),
        type: finalType, // 使用编号后的类型（Cobb1, Cobb2, Cobb3...）
        value: defaultValue,
        points: points,
        description,
    };

    setMeasurements(prev => {
        // 将本次新增标注加入列表
        const accumulated: MeasurementData[] = [...prev, newMeasurement];

        // 检查是否有其他工具的全部点位均可由继承/共享获得，若是则自动创建对应标注
        for (const tool of tools) {
            if (!tool.pointsNeeded || tool.pointsNeeded <= 0) continue;
            // 已存在该类型的标注则跳过
            if (accumulated.some(m => m.type === tool.name)) continue;

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
                    type: tool.name,
                    value: autoValue,
                    points: autoPoints,
                    description: getDesc(tool.name),
                };
                // 立即追加到 accumulated，以便后续工具可以从本次自动创建的标注中继续推导
                accumulated.push(autoMeasurement);
            }
        }

        return accumulated;
    });
}