import {
    AnnotationSource,
    CfhAnnotation,
    ImageData,
    Point,
    VertebraAnnotation,
} from '@/app/imaging/features/image-viewer/shared/types'
import {Dispatch, SetStateAction} from "react"
import {
    aiDetectKeyPoints,
    aiDetectLateralKeyPoints,
} from '@/services/imageServices';

/**
 * 侧位椎体检测（不设置任何状态，仅返回检测数据）。
 * 用于测量补全：静默调用检测接口，再由 deriveLateral 推导缺失的非 S1 测量（如 T10-L2）。
 */
export async function detectLateralVertebrae(imageBlob: Blob): Promise<{
    vertebrae: VertebraAnnotation[];
    cfh: CfhAnnotation | null;
} | null> {
    try {
        const aiData = await aiDetectLateralKeyPoints(imageBlob, 'image.png');
        const imageWidth: number = aiData.image_width ?? 1;
        const imageHeight: number = aiData.image_height ?? 1;
        const newVertebrae: VertebraAnnotation[] = [];
        let newCfh: CfhAnnotation | null = null;

        if (aiData.vertebrae && Array.isArray(aiData.vertebrae)) {
            const vertebraeMap = new Map<string, any>();
            (aiData.vertebrae as any[])
                .filter((v: any) => v.confidence >= 0.1)
                .forEach((v: any) => {
                    const existing = vertebraeMap.get(v.label);
                    if (!existing || v.confidence > existing.confidence) {
                        vertebraeMap.set(v.label, v);
                    }
                });

            vertebraeMap.forEach((vertebra: any) => {
                if (vertebra.label === 'S1' && vertebra.keypoints?.length >= 2) {
                    vertebra.keypoints.slice(0, 2).forEach((kp: any, index: number) => {
                        const pt = { x: kp.x * imageWidth, y: kp.y * imageHeight };
                        newVertebrae.push({
                            label: `S1-${index + 1}`,
                            corners: [pt, pt, pt, pt],
                            confidence: vertebra.confidence,
                            source: AnnotationSource.AI,
                        });
                    });
                    return;
                }
                if (!vertebra.keypoints || vertebra.keypoints.length !== 4) return;
                const rawPts = vertebra.keypoints.map((kp: any) => ({
                    x: kp.x * imageWidth,
                    y: kp.y * imageHeight,
                }));
                const [tl, tr, bl, br] = sortCornersGeometrically(rawPts);
                newVertebrae.push({
                    label: vertebra.label,
                    corners: [tl, tr, bl, br],
                    confidence: vertebra.confidence,
                    source: AnnotationSource.AI,
                });
            });
        }

        if (aiData.cfh && aiData.cfh.center) {
            const cfhPoint = {
                x: aiData.cfh.center.x * imageWidth,
                y: aiData.cfh.center.y * imageHeight,
            };
            newCfh = {
                center: cfhPoint,
                confidence: aiData.cfh.confidence ?? 1,
                source: AnnotationSource.AI,
            };
        }

        return { vertebrae: newVertebrae, cfh: newCfh };
    } catch (e) {
        console.warn('[detectLateralVertebrae] 检测失败，跳过推导补全:', e);
        return null;
    }
}

/**
 * 按几何坐标将4个角点排序为 [TL, TR, BL, BR]。
 * 不依赖 AI 返回的顺序，对脊柱椎体（倾角 < 45°）始终正确。
 */
function sortCornersGeometrically(pts: {x:number,y:number}[]): [Point,Point,Point,Point] {
    const sorted = [...pts].sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x); // y 较小的两点：左=TL，右=TR
    const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x); // y 较大的两点：左=BL，右=BR
    return [top[0], top[1], bot[0], bot[1]];
}

// AI检测函数（仅检测椎骨，结果存入 vertebraeLayer，不混入 measurements[]）
export async function aiDetect(
    imageData: ImageData,
    setVertebraeLayer: Dispatch<SetStateAction<VertebraAnnotation[]>>,
    setCfhAnnotation: Dispatch<SetStateAction<CfhAnnotation | null>>,
    setSaveMessage: (message: string) => void,
    setIsAIDetecting: (aiDetectingState:boolean) => void,
){
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

        const newVertebrae: VertebraAnnotation[] = [];
        let newCfh: CfhAnnotation | null = null;
        let pointCount = 0;
        let vertebraCount = 0;

        // ── 侧位：{ vertebrae: [{label, keypoints:[TL,TR,BL,BR], confidence}], cfh, image_width, image_height }
        if (imageData.examType === '侧位X光片') {
            const imageWidth: number = aiData.image_width;
            const imageHeight: number = aiData.image_height;

            if (aiData.vertebrae && Array.isArray(aiData.vertebrae)) {
                console.log(`🔍 原始检测到 ${aiData.vertebrae.length} 个椎体`);

                // 过滤低置信度 + 去重（保留最高置信度）
                const vertebraeMap = new Map<string, any>();
                (aiData.vertebrae as any[])
                    .filter((v: any) => v.confidence >= 0.1)
                    .forEach((v: any) => {
                        const existing = vertebraeMap.get(v.label);
                        if (!existing || v.confidence > existing.confidence) {
                            vertebraeMap.set(v.label, v);
                        }
                });

                vertebraeMap.forEach((vertebra: any) => {
                    if (vertebra.label === 'S1' && vertebra.keypoints?.length >= 2) {
                        vertebra.keypoints.slice(0, 2).forEach((kp: any, index: number) => {
                            const pt = {
                                x: kp.x * imageWidth,
                                y: kp.y * imageHeight,
                            };
                            newVertebrae.push({
                                label: `S1-${index + 1}`,
                                corners: [pt, pt, pt, pt],
                                confidence: vertebra.confidence,
                                source: AnnotationSource.AI,
                            });
                            pointCount++;
                        });
                        return;
                    }
                    if (!vertebra.keypoints || vertebra.keypoints.length !== 4) {
                        console.warn(`⚠️ 椎体 ${vertebra.label} 角点数量不是4:`, vertebra.keypoints?.length);
                        return;
                    }
                    const rawPts = vertebra.keypoints.map((kp: any) => ({
                        x: kp.x * imageWidth,
                        y: kp.y * imageHeight,
                    }));
                    // 几何排序，不依赖 AI 返回顺序
                    const [tl, tr, bl, br] = sortCornersGeometrically(rawPts);
                    newVertebrae.push({
                        label: vertebra.label,
                        corners: [tl, tr, bl, br],
                        confidence: vertebra.confidence,
                        source: AnnotationSource.AI,
                    });
                    vertebraCount++;
                    pointCount += 4;
                });

                console.log(`✅ 共解析 ${newVertebrae.length} 个椎体`);
            }

            // 股骨头（侧位专用）
            if (aiData.cfh && aiData.cfh.center) {
                const cfhPoint = {
                    x: aiData.cfh.center.x * imageWidth,
                    y: aiData.cfh.center.y * imageHeight,
                };
                newCfh = {
                    center: cfhPoint,
                    confidence: aiData.cfh.confidence ?? 1,
                    source: AnnotationSource.AI,
                };
                newVertebrae.push({
                    label: 'CFH',
                    corners: [cfhPoint, cfhPoint, cfhPoint, cfhPoint],
                    confidence: aiData.cfh.confidence ?? 1,
                    source: AnnotationSource.AI,
                });
                pointCount++;
            }

        } else {
            // ── 正位：{ pose_keypoints: {label: {x,y,confidence}}, vertebrae: {label: {corners:{top_left,...}, confidence}} }
            // 正位的 pose_keypoints 用单点，以单节点椎体形式存入（center only = corners 全同）
            if (aiData.pose_keypoints && typeof aiData.pose_keypoints === 'object') {
                Object.entries(aiData.pose_keypoints).forEach(([label, kp]: [string, any]) => {
                    if (kp && kp.x !== undefined && kp.y !== undefined) {
                        const pt = { x: kp.x, y: kp.y };
                        newVertebrae.push({
                            label,
                            corners: [pt, pt, pt, pt], // pose 关键点只有中心，4角相同
                            confidence: kp.confidence ?? 1,
                            source: AnnotationSource.AI,
                        });
                        pointCount++;
                    }
                });
            }

            if (aiData.vertebrae && typeof aiData.vertebrae === 'object') {
                Object.entries(aiData.vertebrae).forEach(([label, vertebra]: [string, any]) => {
                    if (!vertebra || !vertebra.corners) return;
                    const c = vertebra.corners;
                    const tl = c.top_left    ?? c.topLeft;
                    const tr = c.top_right   ?? c.topRight;
                    const bl = c.bottom_left ?? c.bottomLeft;
                    const br = c.bottom_right ?? c.bottomRight;
                    if (!tl || !tr || !bl || !br) return;
                    const [stl, str, sbl, sbr] = sortCornersGeometrically([
                        { x: tl.x, y: tl.y },
                        { x: tr.x, y: tr.y },
                        { x: bl.x, y: bl.y },
                        { x: br.x, y: br.y },
                    ]);
                    newVertebrae.push({
                        label,
                        corners: [stl, str, sbl, sbr],
                        confidence: vertebra.confidence ?? 1,
                        source: AnnotationSource.AI,
                    });
                    vertebraCount++;
                    pointCount += 4;
                });
            }
        }

        // 写入 vertebraeLayer（替换上一次的检测结果）
        if (newVertebrae.length > 0 || newCfh) {
            setVertebraeLayer(newVertebrae);
            setCfhAnnotation(newCfh);
            setSaveMessage(`AI检测完成，检测到 ${vertebraCount} 个椎体（${pointCount} 个关键点）`);
        } else {
            setSaveMessage('AI检测完成，但未检测到椎体');
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
