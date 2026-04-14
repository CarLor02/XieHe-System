// // AI测量函数（原AI检测函数）
// import {authenticatedBlobFetch} from "@/lib/api";
// import {ImageData, ImageSize, MeasurementData, Point, Tool} from "../types"
// import {getAiMeasurementsResponse} from "@/services/imageServices";
//
// export async function handleAIMeasurement(
//     imageId: string,
//     setImageNaturalSize: (imageNaturalSize: ImageSize) => void,
//     measurements: MeasurementData[],
//     setMeasurements: (measurements: MeasurementData[]) => void,
//     calculateMeasurementValue: (type: string, points: Point[])=>,
//     // getDescriptionForType
//     // getTools: (examType: string)=>Tool[],
//     setIsAIMeasuring: (isAIMeasuring: boolean) => void,
//     setSaveMessage: (message: string) => void,
// ){
//     setIsAIMeasuring(true);
//     setSaveMessage('');
//
//     try {
//         // 获取图片文件
//         const numericId = imageId.replace('IMG', '').replace(/^0+/, '') || '0';
//
//         // 先获取图片
//         const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
//         const imageBlob = await authenticatedBlobFetch(
//             `${apiUrl}/api/v1/image-files/${numericId}/download`
//         );
//
//         // 构建FormData
//         const formData = new FormData();
//         formData.append('file', imageBlob, 'image.png');
//         formData.append('image_id', imageId);
//
//         // 根据examType选择不同的AI测量接口
//         let aiDetectUrl: string;
//         if (imageData.examType === '侧位X光片') {
//             // 侧位使用专用测量接口
//             aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_LATERAL_URL || '';
//             if (!aiDetectUrl) {
//                 throw new Error(
//                     '侧位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_LATERAL_URL'
//                 );
//             }
//         } else {
//             // 正位或其他类型使用默认接口
//             aiDetectUrl = process.env.NEXT_PUBLIC_AI_DETECT_URL || '';
//             if (!aiDetectUrl) {
//                 throw new Error(
//                     '正位X光片AI检测接口未配置，请检查环境变量 NEXT_PUBLIC_AI_DETECT_URL'
//                 );
//             }
//         }
//
//         console.log('🤖 使用AI测量接口:', aiDetectUrl);
//
//         const aiResponse = await fetch(aiDetectUrl, {
//             method: 'POST',
//             body: formData,
//         });
//
//         if (!aiResponse.ok) {
//             throw new Error('AI测量失败');
//         }
//
//         const aiMeasurementsResponse = getAiMeasurementsResponse()
//
//         // 解析AI返回的JSON数据并加载到标注界面
//         if (aiData.measurements && Array.isArray(aiData.measurements)) {
//             const aiImageWidth = aiData.imageWidth || aiData.image_width;
//             const aiImageHeight = aiData.imageHeight || aiData.image_height;
//
//             // 尝试从DOM获取实际图像尺寸
//             let actualImageSize = imageNaturalSize;
//             if (!actualImageSize) {
//                 // 如果state中没有，尝试直接从DOM获取
//                 const imgElement = document.querySelector(
//                     '[data-image-canvas] img'
//                 ) as HTMLImageElement;
//                 if (imgElement && imgElement.naturalWidth > 0) {
//                     actualImageSize = {
//                         width: imgElement.naturalWidth,
//                         height: imgElement.naturalHeight,
//                     };
//                     // 同时更新state
//                     setImageNaturalSize(actualImageSize);
//                 }
//             }
//
//             // 坐标转换：AI返回的是基于原始图像尺寸的坐标
//             // 我们需要检查是否需要缩放
//             let scaleX = 1;
//             let scaleY = 1;
//
//             if (actualImageSize && aiImageWidth && aiImageHeight) {
//                 // 如果AI处理的图像尺寸与实际图像尺寸不同，需要缩放坐标
//                 scaleX = actualImageSize.width / aiImageWidth;
//                 scaleY = actualImageSize.height / aiImageHeight;
//             }
//
//             const tools = getTools(imageData.examType);
//
//             // 统计已有的Cobb角数量（用于自动编号）
//             let cobbCount = measurements.filter(m =>
//                 m.type.startsWith('Cobb')
//             ).length;
//
//             const aiMeasurements = aiData.measurements
//                 .filter(
//                     (m: any) => {
//                         // 检查标注类型是否存在于配置中
//                         // 优先匹配 name（精确匹配），然后匹配 id（小写匹配），最后匹配 name（不区分大小写）
//                         const tool = tools.find(
//                             (t: any) =>
//                                 t.name === m.type ||
//                                 t.id === m.type.toLowerCase() ||
//                                 t.name.toLowerCase() === m.type.toLowerCase() ||
//                                 // 特殊处理：所有Cobb-*类型都匹配到cobb工具
//                                 (m.type.startsWith('Cobb-') && t.id === 'cobb')
//                         );
//
//                         if (!tool) return false;
//
//                         // SVA 改为 5 点法：AI 返回的 SVA 非 5 点时直接过滤，不显示
//                         if (tool.id === 'sva') {
//                             return Array.isArray(m.points) && m.points.length === 5;
//                         }
//
//                         return true;
//                     }
//                 )
//                 .map(
//                     (m: any) => {
//                         // 获取该标注类型所需的点数
//                         const tools = getTools(imageData.examType);
//                         const tool = tools.find(
//                             (t: any) =>
//                                 t.name === m.type ||
//                                 t.id === m.type.toLowerCase() ||
//                                 t.name.toLowerCase() === m.type.toLowerCase() ||
//                                 (m.type.startsWith('Cobb-') && t.id === 'cobb')
//                         );
//                         const requiredPoints = tool?.pointsNeeded || m.points.length;
//
//                         // 如果返回的点数超过所需点数，只保留所需数量的点
//                         let processedPoints = m.points;
//                         if (requiredPoints > 0 && m.points.length > requiredPoints) {
//                             processedPoints = m.points.slice(0, requiredPoints);
//                         }
//
//                         // 转换坐标
//                         const scaledPoints:Point[] = processedPoints.map(
//                             (p: any) => (
//                                 {
//                                     x: p.x * scaleX,
//                                     y: p.y * scaleY,
//                                 }
//                             )
//                         );
//
//                         // 将所有Cobb-*类型统一映射为Cobb1, Cobb2, Cobb3
//                         let finalType = m.type;
//                         let isCobb = false;
//                         if (m.type.startsWith('Cobb-')) {
//                             cobbCount++;
//                             finalType = `Cobb${cobbCount}`;
//                             isCobb = true;
//                         }
//
//                         // 根据type和points重新计算value
//                         // 对于Cobb类型，使用'cobb'配置；其他类型使用原始类型
//                         const typeForCalculation: string = isCobb ? 'cobb' : m.type;
//                         const value = calculateMeasurementValue(
//                             typeForCalculation,
//                             scaledPoints
//                         );
//
//                         // 调试：打印椎体信息
//                         if (isCobb) {
//                             console.log(
//                                 `[DEBUG] ${finalType} 椎体信息:`,
//                                 {
//                                     upper_vertebra: m.upper_vertebra,
//                                     lower_vertebra: m.lower_vertebra,
//                                     apex_vertebra: m.apex_vertebra,
//                                     原始数据: m,
//                                 }
//                             );
//                         }
//
//                         const measurementData :MeasurementData = {
//                             id:
//                                 Date.now().toString() +
//                                 Math.random().toString(36).substring(2, 11),
//                             type: finalType, // 使用映射后的类型（Cobb1, Cobb2, Cobb3）
//                             value: value,
//                             points: scaledPoints,
//                             description: isCobb
//                                 ? 'Cobb角测量'
//                                 : getDescriptionForType(m.type),
//                             originalType: m.type, // 保留原始类型用于调试
//                             // 保存椎体信息（仅Cobb角有）
//                             upperVertebra: m.upper_vertebra,
//                             lowerVertebra: m.lower_vertebra,
//                             apexVertebra: m.apex_vertebra,
//                         };
//
//                         return measurementData
//                     }
//                 );
//
//             setMeasurements(aiMeasurements);
//             // AI 返回后执行一次基于坐标重合的自动绑定
//             const S1_RELATED_TYPES = new Set(
//                 [
//                     'SS',
//                     'LL L1-S1',
//                     'LL L4-S1',
//                     'PI',
//                     'PT',
//                     'TPA',
//                 ]
//             );
//             const s1Count = aiMeasurements.filter((m: any) =>
//                 S1_RELATED_TYPES.has(m.type)
//             ).length;
//             const s1Bindings =
//                 s1Count >= 2
//                     ? autoCreateS1Bindings(aiMeasurements)
//                     : createEmptyBindings();
//             const posBindings = autoCreatePositionBindings(aiMeasurements);
//             setPointBindings(mergeBindings(s1Bindings, posBindings));
//             setSaveMessage(`AI测量完成，已加载 ${aiMeasurements.length} 个标注`);
//             setTimeout(() => setSaveMessage(''), 3000);
//         } else {
//             setSaveMessage('AI测量完成，但未返回有效数据');
//             setTimeout(() => setSaveMessage(''), 3000);
//         }
//     } catch (error) {
//         console.error('AI测量失败:', error);
//         setSaveMessage('AI测量失败，请检查服务是否正常运行');
//         setTimeout(() => setSaveMessage(''), 3000);
//     } finally {
//         setIsAIMeasuring(false);
//     }
// }