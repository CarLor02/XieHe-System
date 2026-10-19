export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  impression: string;
  conclusion: string;
  recommendation: string;
}

export type ReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ReviewRecord {
  id: string;
  operator: string;
  role: string;
  action: string;
  comment: string;
  time: string;
}

export interface ReportData {
  id: string;
  patientName: string;
  patientId: string;
  gender: string;
  age: number;
  checkType: string;
  imageId: string;
  reportDate: string;
  findings: string;
  impression: string;
  conclusion: string;
  recommendation: string;
  status: ReviewStatus;
  reviewer: string;
  reviewTime: string;
  rejectReason: string;
  history: ReviewRecord[];
}

export const reportTemplates: ReportTemplate[] = [
  {
    id: 'T001',
    name: '脊柱侧弯标准模板',
    category: '脊柱侧弯',
    impression: '轻度特发性脊柱侧弯（Cobb角约__°）\n未见明显椎体结构异常',
    conclusion: '特发性脊柱侧弯，Cobb角__°，未达手术指征，建议保守观察。',
    recommendation: '1. 建议每6个月复查全脊柱正侧位X光，动态监测侧弯进展\n2. 加强核心肌群及背部肌肉训练，可配合物理治疗\n3. 注意保持良好坐姿，避免长期单侧负重',
  },
  {
    id: 'T002',
    name: '腰椎间盘突出模板',
    category: '腰椎间盘',
    impression: '腰椎间盘突出（__节段）\n神经根受压征象待排除',
    conclusion: '腰椎间盘突出，建议结合MRI进一步明确突出程度及神经根受压情况。',
    recommendation: '1. 建议完善腰椎MRI检查\n2. 保守治疗为主：卧床休息、物理治疗、药物治疗\n3. 若出现下肢麻木无力或马尾神经症状，及时就诊',
  },
  {
    id: 'T003',
    name: '矢状面平衡模板',
    category: '矢状面平衡',
    impression: '脊柱矢状面失衡（SVA__cm）\n骨盆代偿后旋',
    conclusion: '脊柱矢状面平衡代偿状态，建议动态监测并评估症状。',
    recommendation: '1. 建议完善全脊柱侧位X光动态评估矢状面参数\n2. 加强核心稳定性训练\n3. 若失衡持续加重，考虑进一步专科评估',
  },
  {
    id: 'T004',
    name: '空白模板',
    category: '通用',
    impression: '',
    conclusion: '',
    recommendation: '',
  },
];

export const reportData: ReportData = {
  id: 'R20240115001',
  patientName: '王**',
  patientId: 'P20240115001',
  gender: '男',
  age: 45,
  checkType: '正面',
  imageId: 'IMG001',
  reportDate: '2024/01/15',
  findings:
    '全脊柱正位片显示：胸腰段脊柱呈轻度"C"形侧弯，顶椎位于T9水平，Cobb角约12.9°。椎体排列尚规整，各椎体高度及椎间隙未见明显异常，椎弓根影对称，未见明显骨质破坏征象。骨盆基本水平，双下肢等长，未见明显旋转畸形。',
  impression: '1. 轻度特发性脊柱侧弯（Cobb角约12.9°）\n2. 未见明显椎体结构异常',
  conclusion: '轻度特发性脊柱侧弯，Cobb角12.9°，未达手术指征（<20°），建议保守观察。',
  recommendation:
    '1. 建议每6个月复查全脊柱正侧位X光，动态监测侧弯进展\n2. 加强核心肌群及背部肌肉训练，可配合物理治疗\n3. 注意保持良好坐姿，避免长期单侧负重\n4. 若出现明显进展（>20°）或症状加重，及时就诊',
  status: 'pending',
  reviewer: '',
  reviewTime: '',
  rejectReason: '',
  history: [
    {
      id: 'H001',
      operator: '王医生',
      role: '主治医师',
      action: '提交审核',
      comment: '报告已生成，提交上级医师审核',
      time: '2024/01/15 15:30',
    },
    {
      id: 'H002',
      operator: '系统',
      role: 'AI 辅助',
      action: 'AI 初筛通过',
      comment: '指标均在参考范围或轻度偏离，建议人工复核',
      time: '2024/01/15 15:30',
    },
  ],
};