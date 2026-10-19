export interface AiMetric {
  id: string;
  name: string;
  abbr: string;
  value: string;
  unit: string;
  reference: string;
  status: 'normal' | 'high' | 'low' | 'attention';
  color: string;
  desc: string;
  isPrimary: boolean;
}

export const aiMeasurementResult = {
  imageId: 'IMG001',
  patientName: '王**',
  patientId: 'P20240115001',
  checkType: '侧面',
  analyzedAt: '2024/01/15 15:20',
  aiModel: 'SpineAI v3.2',
  confidence: 96,
  metrics: [
    {
      id: 'M001',
      name: 'Cobb 角',
      abbr: 'Cobb',
      value: '12.9',
      unit: '°',
      reference: '< 10°',
      status: 'high',
      color: '#f43f5e',
      desc: '脊柱侧弯诊断金标准，≥10° 确诊侧弯，当前为轻度侧弯',
      isPrimary: true,
    },
    {
      id: 'M002',
      name: '矢状面纵轴',
      abbr: 'SVA',
      value: '2.5',
      unit: 'cm',
      reference: '< 5 cm',
      status: 'normal',
      color: '#06b6d4',
      desc: 'C7 铅垂线与 S1 后上角的水平距离，反映脊柱整体前倾程度',
      isPrimary: true,
    },
    {
      id: 'M003',
      name: '骨盆入射角',
      abbr: 'PI',
      value: '48',
      unit: '°',
      reference: '40 - 65°',
      status: 'normal',
      color: '#f59e0b',
      desc: '解剖学固定参数，成年后基本不变，决定脊柱整体形态',
      isPrimary: true,
    },
    {
      id: 'M004',
      name: '腰椎前突角',
      abbr: 'LL',
      value: '52',
      unit: '°',
      reference: '40 - 60°',
      status: 'normal',
      color: '#10b981',
      desc: 'L1-S1 的 Cobb 角，评估腰椎整体生理前突',
      isPrimary: true,
    },
    {
      id: 'M005',
      name: '骨盆倾斜角',
      abbr: 'PT',
      value: '15',
      unit: '°',
      reference: '< 20°',
      status: 'normal',
      color: '#0ea5e9',
      desc: '骨盆后旋代偿角度，PT 增大提示身体前倾平衡调节',
      isPrimary: false,
    },
    {
      id: 'M006',
      name: '骶骨倾斜角',
      abbr: 'SS',
      value: '33',
      unit: '°',
      reference: '30 - 45°',
      status: 'normal',
      color: '#8b5cf6',
      desc: 'S1 上终板与水平线的夹角，满足 PI = PT + SS',
      isPrimary: false,
    },
    {
      id: 'M007',
      name: '胸椎后凸角',
      abbr: 'TK',
      value: '38',
      unit: '°',
      reference: '20 - 50°',
      status: 'normal',
      color: '#14b8a6',
      desc: 'T5-T12 节段后凸角度，评估胸椎生理弯曲',
      isPrimary: false,
    },
    {
      id: 'M008',
      name: 'T1 斜率',
      abbr: 'T1 Slope',
      value: '22',
      unit: '°',
      reference: '14 - 32°',
      status: 'normal',
      color: '#6366f1',
      desc: 'T1 上终板与水平线的夹角，反映颈椎底座倾斜',
      isPrimary: false,
    },
  ] as AiMetric[],
};