import {ImageData, MeasurementData} from "../types"
import {Dispatch, SetStateAction} from "react"
import {
    aiDetectKeyPoints,
    aiDetectLateralKeyPoints,
} from '@/services/imageServices';

// AI检测函数（仅检测椎骨，不包含测量）
export async function aiDetect(
    isAdmin: boolean,
    imageData: ImageData,
    setMeasurements: Dispatch<SetStateAction<MeasurementData[]>>,
    setSaveMessage: (message: string) => void,
    setIsAIDetecting: (aiDetectingState:boolean) => void,
){
    // 权限检查
    if (!isAdmin) {
        setSaveMessage('无权限：仅管理员可以使用AI检测功能');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
    }

    setIsAIDetecting(true);
    setSaveMessage('');

    try {
        // 获取图像元素
        const imgElement = document.querySelector(
            '[data-image-canvas] img'
        ) as HTMLImageElement;
        if (!imgElement) {
            setSaveMessage('未找到图像元素');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsAIDetecting(false);
            return;
        }

        // 将图像转换为Blob
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('无法创建canvas上下文'));
                return;
            }
            ctx.drawImage(imgElement, 0, 0);
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('无法生成图像'));
            }, 'image/png');
        });

        let aiData: any;
        if (imageData.examType === '侧位X光片') {
            aiData = await aiDetectLateralKeyPoints(imageBlob, 'image.png');
        } else {
            aiData = await aiDetectKeyPoints(imageBlob, 'image.png');
        }
        console.log('AI检测返回数据:', aiData);

        // 处理检测结果，将关键点转换为可视化标注
        const detectionMeasurements: MeasurementData[] = [];
        let pointCount = 0;

        // 判断是侧位还是正位，使用不同的数据处理逻辑
        if (imageData.examType === '侧位X光片') {
            // 侧位：处理 /api/detect 返回的数据
            // 数据格式：{ vertebrae: [...], cfh: {...}, image_width, image_height }

            const imageWidth = aiData.image_width;
            const imageHeight = aiData.image_height;

            // 处理椎体检测结果
            if (aiData.vertebrae && Array.isArray(aiData.vertebrae)) {
                console.log(`🔍 原始检测到 ${aiData.vertebrae.length} 个椎体`);
                console.log(
                    '原始椎体列表:',
                    aiData.vertebrae
                        .map(
                            (v: any) => `${v.label}(${(v.confidence * 100).toFixed(1)}%)`
                        )
                        .join(', ')
                );

                // 1. 过滤掉置信度过低的检测（< 0.5）
                const highConfidenceVertebrae = aiData.vertebrae.filter(
                    (v: any) => v.confidence >= 0.1
                );
                console.log(
                    `🔍 过滤后剩余 ${highConfidenceVertebrae.length} 个高置信度椎体`
                );

                // 2. 去重：同一个椎体只保留置信度最高的
                const vertebraeMap = new Map<string, any>();
                highConfidenceVertebrae.forEach((vertebra: any) => {
                    const existing = vertebraeMap.get(vertebra.label);
                    if (!existing || vertebra.confidence > existing.confidence) {
                        vertebraeMap.set(vertebra.label, vertebra);
                    }
                });

                const uniqueVertebrae = Array.from(vertebraeMap.values());
                console.log(`✅ 去重后剩余 ${uniqueVertebrae.length} 个唯一椎体`);
                console.log(
                    '最终椎体列表:',
                    uniqueVertebrae
                        .map(
                            (v: any) => `${v.label}(${(v.confidence * 100).toFixed(1)}%)`
                        )
                        .join(', ')
                );

                // 3. 处理每个椎体的4个角点
                uniqueVertebrae.forEach((vertebra: any) => {
                    if (!vertebra.keypoints || vertebra.keypoints.length !== 4) {
                        console.warn(
                            `⚠️ 椎体 ${vertebra.label} 的关键点数量不是4个:`,
                            vertebra.keypoints?.length
                        );
                        return;
                    }

                    // 椎体的4个角点（归一化坐标，需要转换为像素坐标）
                    const keypoints = vertebra.keypoints.map((kp: any) => ({
                        x: kp.x * imageWidth,
                        y: kp.y * imageHeight,
                    }));

                    // 按1、2、3、4编号显示4个角点
                    keypoints.forEach((point: any, index: number) => {
                        const cornerNum = index + 1;
                        const cornerNames = ['左上', '右上', '左下', '右下'];

                        // 生成唯一ID（使用时间戳+随机数）
                        const uniqueId = `ai-detection-${vertebra.label}-${cornerNum}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                        detectionMeasurements.push({
                            id: uniqueId,
                            type: `AI检测-${vertebra.label}-${cornerNum}`,
                            value: `${vertebra.label}-${cornerNum}`,
                            points: [point],
                            description: `AI检测-${vertebra.label}角点${cornerNum}(${cornerNames[index]}) (置信度: ${(vertebra.confidence * 100).toFixed(1)}%)`,
                        });
                        pointCount++;
                    });
                });

                console.log(`✅ 共生成 ${pointCount} 个椎体角点`);
            }

            // 处理股骨头检测结果
            if (aiData.cfh && aiData.cfh.center) {
                const cfhCenter = {
                    x: aiData.cfh.center.x * imageWidth,
                    y: aiData.cfh.center.y * imageHeight,
                };

                detectionMeasurements.push({
                    id: 'ai-detection-cfh',
                    type: 'AI检测-CFH',
                    value: 'CFH',
                    points: [cfhCenter],
                    description: `AI检测-股骨头中心 (置信度: ${(aiData.cfh.confidence * 100).toFixed(1)}%)`,
                });
                pointCount++;
            }
        } else {
            // 正位：处理原有的 detect_keypoints 返回的数据
            // 1. 处理躯干关键点 (pose_keypoints) - 对象格式
            if (
                aiData.pose_keypoints &&
                typeof aiData.pose_keypoints === 'object'
            ) {
                Object.entries(aiData.pose_keypoints).forEach(
                    ([label, kp]: [string, any]) => {
                        if (kp && kp.x !== undefined && kp.y !== undefined) {
                            detectionMeasurements.push({
                                id: `ai-detection-pose-${label}`,
                                type: `AI检测-${label}`,
                                value: label,
                                points: [{ x: kp.x, y: kp.y }],
                                description: `AI检测-躯干关键点 (置信度: ${(kp.confidence * 100).toFixed(1)}%)`,
                            });
                            pointCount++;
                        }
                    }
                );
            }

            // 2. 处理椎骨关键点 (vertebrae) - 对象格式，显示4个角点
            if (aiData.vertebrae && typeof aiData.vertebrae === 'object') {
                Object.entries(aiData.vertebrae).forEach(
                    ([label, vertebra]: [string, any]) => {
                        if (!vertebra || !vertebra.corners) return;

                        // 添加椎骨的4个角点，按1、2、3、4编号
                        const corners = vertebra.corners;
                        const cornerNames = [
                            { key: 'top_left', num: '1', displayName: '左上' },
                            { key: 'top_right', num: '2', displayName: '右上' },
                            { key: 'bottom_right', num: '3', displayName: '右下' },
                            { key: 'bottom_left', num: '4', displayName: '左下' },
                        ];

                        cornerNames.forEach(corner => {
                            const point = corners[corner.key];
                            if (point && point.x !== undefined && point.y !== undefined) {
                                detectionMeasurements.push({
                                    id: `ai-detection-${label}-${corner.num}`,
                                    type: `AI检测-${label}-${corner.num}`,
                                    value: `${label}-${corner.num}`,
                                    points: [{ x: point.x, y: point.y }],
                                    description: `AI检测-${label}角点${corner.num}(${corner.displayName}) (置信度: ${(vertebra.confidence * 100).toFixed(1)}%)`,
                                });
                                pointCount++;
                            }
                        });
                    }
                );
            }
        }

        // 3. 清除之前的AI检测结果，然后添加新的检测结果
        if (detectionMeasurements.length > 0) {
            // 先清除所有AI检测的标注（type以"AI检测-"开头的）
            setMeasurements(prev => {
                const nonAIDetections = prev.filter(
                    m => !m.type.startsWith('AI检测-')
                );
                return [...nonAIDetections, ...detectionMeasurements];
            });
            setSaveMessage(`AI检测完成，检测到 ${pointCount} 个关键点`);
        } else {
            setSaveMessage('AI检测完成，但未检测到关键点');
        }
        setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
        console.error('AI检测失败:', error);
        setSaveMessage('AI检测失败，请检查服务是否正常运行');
        setTimeout(() => setSaveMessage(''), 3000);
    } finally {
        setIsAIDetecting(false);
    }
}
