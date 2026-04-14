import {MeasurementData, ImageData} from "@/app/imaging/viewer/image-viewer/types";
import { generateMeasurementReport } from '@/services/imageServices';

/*
* 生成报告
* */
export async function generateReport(
    imageData: ImageData,
    measurements: MeasurementData[],
    setReportText: (text: string) => void,
    setSaveMessage: (text: string) => void,
) {
    if (measurements.length === 0) {
        setReportText('暂无测量数据，无法生成报告。请先进行相关测量。');
        return;
    }

    try {
        // 调用后端API生成报告
        const result = await generateMeasurementReport({
            imageId: imageData.id,
            examType: imageData.examType,
            measurements: measurements.map(m => ({
                type: m.type,
                value: m.value,
                description: m.description,
            })),
        });

        if (result.report) {
            setReportText(result.report);
            setSaveMessage('报告生成成功');
            setTimeout(() => setSaveMessage(''), 3000);
        } else {
            throw new Error('报告生成失败');
        }
    } catch (error) {
        console.error('生成报告失败:', error);

        // 如果API调用失败，使用本地简单生成作为后备方案
        let report = `【${imageData.examType}测量报告】\n\n`;
        report += `患者：${imageData.patientName} (${imageData.patientId})\n`;
        report += `检查日期：${imageData.studyDate}\n`;
        report += `影像类型：${imageData.examType}\n\n`;

        report += `【测量结果】\n`;
        measurements.forEach((measurement, index) => {
            report += `${index + 1}. ${measurement.type}：${measurement.value}\n`;
            if (measurement.description) {
                report += `   ${measurement.description}\n`;
            }
        });

        report += `\n【分析建议】\n`;

        // 根据不同影像类型生成专业分析
        if (imageData.examType === '正位X光片') {
            // 查找 Cobb 测量（可能是 Cobb、Cobb1、Cobb2 等）
            const cobbMeasurement = measurements.find(m =>
                m.type.startsWith('Cobb')
            );
            const caMeasurement = measurements.find(m => m.type === 'CA');

            if (cobbMeasurement) {
                const cobbValue = parseFloat(cobbMeasurement.value);
                if (cobbValue > 10) {
                    report += `• 脊柱侧弯程度：${cobbValue < 25 ? '轻度' : cobbValue < 40 ? '中度' : '重度'}（${cobbMeasurement.type} ${cobbMeasurement.value}）\n`;
                }
            }

            if (caMeasurement) {
                const caValue = parseFloat(caMeasurement.value);
                if (caValue > 10) {
                    report += `• 双肩高度差异明显，提示存在肩部不平衡\n`;
                }
            }
        } else if (imageData.examType === '侧位X光片') {
            const tkMeasurement = measurements.find(m => m.type === 'TK');
            const llMeasurement = measurements.find(m => m.type === 'LL');
            const svaMeasurement = measurements.find(m => m.type === 'SVA');

            if (tkMeasurement) {
                report += `• 胸椎后凸角：${tkMeasurement.value}，形态${parseFloat(tkMeasurement.value) > 40 ? '偏大' : '正常'}\n`;
            }

            if (llMeasurement) {
                report += `• 腰椎前凸角：${llMeasurement.value}，弯曲${parseFloat(llMeasurement.value) < 40 ? '偏小' : '正常'}\n`;
            }

            if (svaMeasurement) {
                const svaValue = parseFloat(svaMeasurement.value);
                if (svaValue > 40) {
                    report += `• 矢状面平衡异常，存在前倾趋势\n`;
                }
            }
        }

        report += `\n报告生成时间：${new Date().toLocaleString('zh-CN')}\n`;
        report += `系统：AI辅助测量分析`;

        setReportText(report);
        setSaveMessage('使用本地模式生成报告');
        setTimeout(() => setSaveMessage(''), 3000);
    }
};
