import {
  getAnnotationTypeId,
  getToolCapability,
  type ToolCapability,
} from '@xiehe/imaging-core/measurements';

export type ImagingCatalogLocale = 'zh-CN';

export interface ToolCopyKeys {
  nameKey: `tool.${string}.name`;
  descriptionKey: `tool.${string}.description`;
}

export interface LocalizedToolCopy extends ToolCopyKeys {
  id: string;
  name: string;
  description: string;
  capability: ToolCapability;
}

interface ToolCopySource {
  name: string;
  description: string;
}

const ZH_CN_TOOL_COPY: Readonly<Record<string, ToolCopySource>> = {
  't1-tilt': { name: 'T1 Tilt', description: 'T1椎体倾斜角测量' },
  cobb: { name: 'Cobb', description: 'Cobb角测量' },
  ca: { name: 'CA', description: '锁骨角测量(Clavicle Angle)' },
  po: { name: 'PO', description: '骨盆倾斜角(Pelvic obliquity, PO)' },
  css: {
    name: 'CSS',
    description: '冠状面骶骨倾斜角CSS(Coronal Sacral Slope)',
  },
  avt: {
    name: 'AVT',
    description: '顶椎平移量(Apical Vertebral Translation)',
  },
  tts: { name: 'TTS', description: '胸廓躯干偏移TTS(Thoracic Trunk Shift)' },
  lld: { name: 'LLD', description: '双下肢不等长' },
  'hemipelvic-width-ratio': {
    name: 'L/R',
    description: '半骨盆宽度比(L/R)',
  },
  ts: { name: 'TS', description: '躯干偏移TS(Trunk Shift)' },
  't1-slope': { name: 'T1 Slope', description: 'T1倾斜角测量（侧位）' },
  'tk-t2-t5': {
    name: 'TK T2-T5',
    description: '上胸椎后凸角(T2上终板与T5下终板)',
  },
  'tk-t5-t12': {
    name: 'TK T5-T12',
    description: '主胸椎后凸角(T5上终板与T12下终板)',
  },
  't10-l2': {
    name: 'T10-L2',
    description: '胸腰椎后凸角(T10上终板与L2下终板)',
  },
  'll-l1-s1': {
    name: 'LL L1-S1',
    description: '整体腰椎前凸(L1上终板与S1上终板)',
  },
  'll-l1-l4': {
    name: 'LL L1-L4',
    description: '腰椎前凸L1-L4(L1上终板与L4下终板)',
  },
  'll-l4-s1': {
    name: 'LL L4-S1',
    description: '腰椎前凸L4-S1(L4上终板与S1上终板)',
  },
  tpa: { name: 'TPA', description: 'T1骨盆角(T1 Pelvic Angle)' },
  sva: { name: 'SVA', description: '矢状面垂直轴(Sagittal Vertical Axis)' },
  pi: { name: 'PI', description: '骨盆入射角(Pelvic Incidence)' },
  pt: { name: 'PT', description: '骨盆倾斜角(Pelvic Tilt)' },
  ss: { name: 'SS', description: '骶骨倾斜角(Sacral Slope)' },
  cl: { name: 'C2-C7 CL', description: 'C2-C7前凸角测量(Cervical Lordosis)' },
  'lateral-cobb': { name: 'Cobb', description: '任意两节段Cobb角测量' },
  length: { name: '长度测量', description: '距离测量工具' },
  angle: { name: '角度测量', description: '通用角度测量' },
  'vertebra-center': {
    name: '椎体中心',
    description: '标注椎体中心（4个角点）',
  },
  circle: { name: 'Auxiliary Circle', description: '辅助圆形' },
  ellipse: { name: 'Auxiliary Ellipse', description: '辅助椭圆' },
  rectangle: { name: 'Auxiliary Box', description: '辅助矩形' },
  arrow: { name: 'Arrow', description: '箭头' },
  polygon: { name: 'Polygons', description: '多边形' },
  'aux-length': { name: '距离标注', description: '辅助距离测量' },
  'aux-angle': {
    name: '角度标注',
    description: '辅助角度测量（两条线段夹角）',
  },
  'aux-horizontal-line': {
    name: '辅助水平线',
    description: '辅助水平线段长度测量',
  },
  'aux-vertical-line': {
    name: '辅助垂直线',
    description: '辅助垂直线段长度测量',
  },
};

function resolveNumberedCobbCopy(toolId: string): ToolCopySource | undefined {
  const match = /^(lateral-)?cobb(\d+)$/i.exec(toolId);
  if (!match) return undefined;
  return {
    name: `Cobb${match[2]}`,
    description: `Cobb角${match[2]}测量`,
  };
}

export function getToolCopyKeys(toolId: string): ToolCopyKeys {
  const normalizedId = getAnnotationTypeId(toolId);
  return {
    nameKey: `tool.${normalizedId}.name`,
    descriptionKey: `tool.${normalizedId}.description`,
  };
}

export function getLocalizedToolCopy(
  toolId: string,
  _locale: ImagingCatalogLocale = 'zh-CN'
): LocalizedToolCopy | undefined {
  const normalizedId = getAnnotationTypeId(toolId);
  const numberedCobb = resolveNumberedCobbCopy(normalizedId);
  const baseId = /^lateral-cobb\d+$/i.test(normalizedId)
    ? 'lateral-cobb'
    : /^cobb\d+$/i.test(normalizedId)
      ? 'cobb'
      : normalizedId;
  const capability = getToolCapability(baseId);
  const copy = numberedCobb ?? ZH_CN_TOOL_COPY[normalizedId];
  if (!capability || !copy) return undefined;
  return {
    id: normalizedId,
    ...getToolCopyKeys(normalizedId),
    ...copy,
    capability,
  };
}

export function getToolDisplayName(toolId: string): string {
  return getLocalizedToolCopy(toolId)?.name ?? toolId;
}

export function getToolDescription(toolId: string): string {
  return getLocalizedToolCopy(toolId)?.description ?? toolId;
}
