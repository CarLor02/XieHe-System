
export const annotationData = {
  imageId: 'IMG001',
  patientId: 'P20240115001',
  patientName: '王**',
  fileName: '20240115_spine_lateral.png',
  checkType: 'XR',
  measurements: [
    { id: 'M001', type: 'T1倾斜', value: '-8.5°', color: '#FF6B6B' },
    { id: 'M002', type: '斜肩', value: '辅助标记', color: '#4ECDC4' },
    { id: 'M003', type: 'RSH', value: '辅助标记', color: '#45B7D1' },
    { id: 'M004', type: '骨盆', value: '0.4°', color: '#96CEB4' },
    { id: 'M005', type: '骶骨', value: '1.3°', color: '#FFEAA7' },
    { id: 'M006', type: 'TS', value: '11.4毫米', color: '#98D8C8' }
  ],
  cobbAngles: [
    { id: 'C001', name: 'TS', value: '11.4mm', position: 'top' },
    { id: 'C002', name: 'RSH', value: '辅助标记', position: 'top-middle' },
    { id: 'C003', name: 'AVT', value: '12.9mm', position: 'middle' },
    { id: 'C004', name: 'Cobb', value: '辅助标记', position: 'middle' },
    { id: 'C005', name: 'Pelvic', value: '0.4°', position: 'bottom' },
    { id: 'C006', name: 'Sacral', value: '1.3°', position: 'bottom' }
  ],
  // 正面工具
  frontTools: [
    { id: 'T001', name: 'T1 Tilt', icon: 'ri-focus-line', count: 2, tooltip: 'T1倾斜角\nT1椎体上终板与水平线的夹角，反映高位胸弯及肩膀平衡状态，角度偏大提示术后肩膀不等高风险' },
    { id: 'T002', name: 'Cobb', icon: 'ri-compass-3-line', count: 4, tooltip: 'Cobb角\n脊柱侧弯诊断金标准，测量侧弯两端椎体的夹角。≥10°确诊侧弯，≥40°通常考虑手术' },
    { id: 'T003', name: 'CA', icon: 'ri-record-circle-line', count: 2, tooltip: '冠状面平衡角\nCoronal Alignment，评估脊柱在冠状面的整体偏移与平衡状态' },
    { id: 'T004', name: 'Pelvic', icon: 'ri-triangle-line', count: 2, tooltip: '骨盆倾斜\n测量骨盆在冠状面的左右倾斜角度，评估骨盆是否水平，常与下肢不等长相关' },
    { id: 'T005', name: 'Sacral', icon: 'ri-checkbox-blank-line', count: 0, tooltip: '骶骨倾斜\n骶骨在冠状面的倾斜角度，反映脊柱底座的水平状态，影响整体冠状面平衡' },
    { id: 'T006', name: 'AVT', icon: 'ri-focus-2-line', count: 2, tooltip: '顶椎位移\nApical Vertebral Translation，侧弯顶椎中心距骶骨中线的水平距离，AVT越大侧弯越严重' },
    { id: 'T007', name: 'TTS', icon: 'ri-crosshair-line', count: 2, tooltip: '胸椎躯干偏移\nThoracic Trunk Shift，胸椎顶端相对于下段脊柱或骨盆的水平位移量' },
    { id: 'T008', name: 'LLD', icon: 'ri-arrow-up-down-line', count: 2, tooltip: '下肢不等长\nLeg Length Discrepancy，左右下肢长度之差，下肢不等长常引起代偿性脊柱侧弯' },
    { id: 'T009', name: 'TS(Trunk Shift)', icon: 'ri-arrow-left-right-line', count: 6, tooltip: '躯干偏移\nTrunk Shift，C7椎体中心垂线与骶骨中线的水平距离，衡量躯干整体相对骨盆的冠状面平衡' },
    { id: 'T010', name: '椎体中心', icon: 'ri-focus-line', count: 4, tooltip: '椎体中心标记\n标记各椎体几何中心点，用于计算脊柱轴线偏移及各段侧弯角度的参考基准' },
    { id: 'T011', name: '距离标注', icon: 'ri-ruler-2-line', count: 2, tooltip: '距离测量\n在影像上标注任意两点间的实际距离，需结合标准距离设置进行比例换算' }
  ],
  // 侧面工具
  lateralTools: [
    { id: 'L001', name: 'T1 Slope', icon: 'ri-focus-line', count: 2, tooltip: 'T1斜率\nT1椎体上终板与水平线的夹角，反映颈椎底座倾斜程度，T1 Slope越大颈椎需要更大前突来维持头部平衡' },
    { id: 'L002', name: 'C2-C7 Cl', icon: 'ri-compass-3-line', count: 4, tooltip: '颈椎前突角\nC2-C7 Cervical Lordosis，C2与C7下终板的Cobb角，评估颈椎生理弯曲度是否正常' },
    { id: 'L003', name: 'TK T2-T5', icon: 'ri-record-circle-line', count: 4, tooltip: '上胸椎后凸角\nThoracic Kyphosis T2-T5，测量T2至T5节段的后凸角度，评估上胸段弯曲状态' },
    { id: 'L004', name: 'TK T5-T12', icon: 'ri-record-circle-line', count: 4, tooltip: '胸椎后凸角\nThoracic Kyphosis T5-T12，测量T5至T12节段后凸角度，正常值约20°~50°，反映胸椎生理弯曲' },
    { id: 'L005', name: 'T10-L2', icon: 'ri-crosshair-line', count: 4, tooltip: '胸腰段后凸角\nT10至L2节段的Cobb角，评估胸腰交界区的弯曲状态，该区域异常常见于骨质疏松性骨折' },
    { id: 'L006', name: 'LL L1-S1', icon: 'ri-route-line', count: 4, tooltip: '腰椎前突角（全段）\nLumbar Lordosis L1-S1，L1至S1的Cobb角，评估腰椎整体前突，正常值约40°~60°' },
    { id: 'L007', name: 'LL L1-L4', icon: 'ri-route-line', count: 4, tooltip: '腰椎前突角（上段）\nLumbar Lordosis L1-L4，评估腰椎上段前突角度，用于分析腰椎各节段的弯曲分布' },
    { id: 'L008', name: 'LL L4-S1', icon: 'ri-route-line', count: 4, tooltip: '腰椎前突角（下段）\nLumbar Lordosis L4-S1，评估腰椎下段前突角度，该节段对腰骶部稳定性影响最大' },
    { id: 'L009', name: 'TPA', icon: 'ri-triangle-line', count: 7, tooltip: '躯干骨盆角\nTrunk-Pelvis Angle，躯干轴线与骨盆轴线的夹角，综合评估躯干与骨盆的矢状面对位关系' },
    { id: 'L010', name: 'SVA', icon: 'ri-arrow-down-line', count: 5, tooltip: '矢状面纵轴线距离\nSagittal Vertical Axis，C7中心垂线与S1后上角的水平距离，SVA>5cm提示脊柱整体前倾失衡' },
    { id: 'L011', name: 'PI', icon: 'ri-focus-2-line', count: 3, tooltip: '骨盆入射角\nPelvic Incidence，解剖学固定参数，成年后基本不变，决定脊柱整体形态，PI=PT+SS' },
    { id: 'L012', name: 'PT', icon: 'ri-compass-discover-line', count: 3, tooltip: '骨盆倾斜角\nPelvic Tilt，PT增大表示骨盆后旋代偿，常见于脊柱前倾严重时身体的自我平衡调节' },
    { id: 'L013', name: 'SS', icon: 'ri-record-circle-line', count: 2, tooltip: '骶骨倾斜角\nSacral Slope，S1上终板与水平线的夹角，反映脊柱底座陡峭程度，与PI和PT满足：PI=PT+SS' },
    { id: 'L014', name: '椎体中心', icon: 'ri-focus-line', count: 4, tooltip: '椎体中心标记\n标记各椎体几何中心点，用于计算矢状面脊柱轴线及各参数的参考基准点' },
    { id: 'L015', name: '距离标注', icon: 'ri-ruler-2-line', count: 2, tooltip: '距离测量\n在影像上标注任意两点间的实际距离，需结合标准距离设置进行比例换算' }
  ],
  // 兼容旧引用
  tools: [
    { id: 'T001', name: 'T1 Tilt', icon: 'ri-focus-line', count: 2, tooltip: 'T1倾斜角\nT1椎体上终板与水平线的夹角，反映高位胸弯及肩膀平衡状态' },
    { id: 'T002', name: 'Cobb', icon: 'ri-compass-3-line', count: 4, tooltip: 'Cobb角\n脊柱侧弯诊断金标准，≥10°确诊侧弯，≥40°通常考虑手术' },
    { id: 'T003', name: 'CA', icon: 'ri-record-circle-line', count: 2, tooltip: '冠状面平衡角\n评估脊柱在冠状面的整体偏移与平衡状态' },
    { id: 'T004', name: 'Pelvic', icon: 'ri-triangle-line', count: 2, tooltip: '骨盆倾斜\n测量骨盆在冠状面的左右倾斜角度' },
    { id: 'T005', name: 'Sacral', icon: 'ri-checkbox-blank-line', count: 0, tooltip: '骶骨倾斜\n骶骨在冠状面的倾斜角度，反映脊柱底座水平状态' },
    { id: 'T006', name: 'AVT', icon: 'ri-focus-2-line', count: 2, tooltip: '顶椎位移\n侧弯顶椎中心距骶骨中线的水平距离' },
    { id: 'T007', name: 'TTS', icon: 'ri-crosshair-line', count: 2, tooltip: '胸椎躯干偏移\n胸椎顶端相对于下段脊柱或骨盆的水平位移量' },
    { id: 'T008', name: 'LLD', icon: 'ri-arrow-up-down-line', count: 2, tooltip: '下肢不等长\n左右下肢长度之差，常引起代偿性脊柱侧弯' },
    { id: 'T009', name: 'TS(Trunk Shift)', icon: 'ri-arrow-left-right-line', count: 6, tooltip: '躯干偏移\nC7椎体中心垂线与骶骨中线的水平距离' },
    { id: 'T010', name: '椎体中心', icon: 'ri-focus-line', count: 4, tooltip: '椎体中心标记\n标记各椎体几何中心点，用于计算脊柱轴线偏移' },
    { id: 'T011', name: '距离标注', icon: 'ri-ruler-2-line', count: 2, tooltip: '距离测量\n在影像上标注任意两点间的实际距离' }
  ],
  shapes: [
    { id: 'S001', name: 'Circle', icon: 'ri-checkbox-blank-circle-line', count: 0, tooltip: '圆形\n绘制正圆形辅助标注区域，用于圈选特定椎体或病变区域' },
    { id: 'S002', name: 'Ellipse', icon: 'ri-checkbox-indeterminate-line', count: 0, tooltip: '椭圆形\n绘制椭圆形辅助标注区域，适合标注不规则的椭圆形病变范围' },
    { id: 'S003', name: 'Box', icon: 'ri-checkbox-blank-line', count: 0, tooltip: '矩形框\n绘制矩形标注框，用于框选感兴趣区域或标注特定椎体节段' },
    { id: 'S004', name: 'Arrow', icon: 'ri-arrow-right-line', count: 0, tooltip: '箭头标注\n绘制带方向的箭头，用于指示特定解剖结构或病变位置' },
    { id: 'S005', name: '多边形', icon: 'ri-shape-line', count: 0, tooltip: '多边形\n自由绘制多边形轮廓，适合标注形状不规则的病变或解剖区域' },
    { id: 'S006', name: '角度标注', icon: 'ri-compass-3-line', count: 0, tooltip: '角度标注\n通过三点绘制任意角度，用于测量椎体终板夹角等自定义角度' },
    { id: 'S007', name: '辅助水平线', icon: 'ri-separator', count: 0, tooltip: '辅助水平线\n绘制贯穿影像的水平参考线，用于对比左右两侧高度差异' },
    { id: 'S008', name: '辅助垂直线', icon: 'ri-layout-column-line', count: 0, tooltip: '辅助垂直线\n绘制贯穿影像的垂直参考线，用于评估脊柱中轴线偏移程度' }
  ],
  imageSettings: {
    contrast: 100,
    brightness: 0,
    hue: 0,
    standardDistance: 100
  }
};

export const annotationHistory = [
  {
    id: 'AH001',
    imageId: 'IMG001',
    operator: '张医生',
    action: '添加Cobb角测量',
    time: '2024/01/15 15:30',
    result: '侧弯角度 12.9°'
  },
  {
    id: 'AH002',
    imageId: 'IMG001',
    operator: '张医生',
    action: '添加骨盆倾斜测量',
    time: '2024/01/15 15:25',
    result: '倾斜角度 0.4°'
  },
  {
    id: 'AH003',
    imageId: 'IMG001',
    operator: 'AI辅助',
    action: '自动识别脊柱轮廓',
    time: '2024/01/15 15:20',
    result: '识别完成'
  }
];
