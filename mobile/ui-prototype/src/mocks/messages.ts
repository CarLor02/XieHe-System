export interface MessageBiz {
  type: 'annotation' | 'report' | 'image' | 'none';
  targetId: string;
  label: string;
  buttonText: string;
}

export interface MessageItem {
  id: string;
  type: string;
  title: string;
  content: string;
  detail: string;
  time: string;
  read: boolean;
  sender: string;
  biz: MessageBiz;
}

export const messagesData: MessageItem[] = [
  {
    id: 'MSG001',
    type: '审核提醒',
    title: '新的影像待审核',
    content: '患者王**的脊柱影像已上传，请及时进行审核标注。',
    detail:
      '患者王**（P20240115001）的全脊柱正位片已完成上传与 AI 预标注，Cobb 角约 12.9°，存在轻度侧弯。\n\n请尽快进入标注页复核 AI 测量结果，确认无误后提交审核。',
    time: '2024/01/15 14:30',
    read: false,
    sender: '影像中心',
    biz: { type: 'annotation', targetId: 'IMG001', label: '待审核影像', buttonText: '去标注审核' },
  },
  {
    id: 'MSG002',
    type: '系统通知',
    title: '系统维护通知',
    content: '系统将于今晚22:00-23:00进行例行维护，期间可能无法访问，请提前做好工作安排。',
    detail:
      '为保障系统稳定运行，平台将于今晚 22:00 - 23:00 进行例行维护升级。\n\n维护期间影像上传、AI 分析、报告生成等功能可能短暂不可用，请提前保存好进行中的工作，避免数据丢失。\n\n给您带来不便，敬请谅解。',
    time: '2024/01/15 10:00',
    read: false,
    sender: '系统管理员',
    biz: { type: 'none', targetId: '', label: '', buttonText: '' },
  },
  {
    id: 'MSG003',
    type: '审核提醒',
    title: '影像审核超时提醒',
    content: '患者李**的影像已上传超过24小时，请尽快完成审核。',
    detail:
      '患者李**（P20240115002）的脊柱侧位片已上传超过 24 小时，尚未完成审核标注。\n\n为避免影响诊断流程，请尽快进入影像详情查看并完成标注审核。',
    time: '2024/01/14 16:20',
    read: true,
    sender: '质控中心',
    biz: { type: 'image', targetId: 'IMG002', label: '待审核影像', buttonText: '查看影像' },
  },
  {
    id: 'MSG004',
    type: '系统通知',
    title: '新功能上线',
    content: '影像中心新增AI辅助诊断功能，可自动识别脊柱侧弯角度，欢迎体验。',
    detail:
      '影像中心已上线 AI 辅助诊断功能，可自动识别并测量脊柱侧弯 Cobb 角、矢状面参数（SVA、PI、PT 等）。\n\n系统会在影像上传后自动运行分析，并将结果叠加标注在影像上，辅助医生快速出具诊断报告。',
    time: '2024/01/14 09:00',
    read: true,
    sender: '产品团队',
    biz: { type: 'none', targetId: '', label: '', buttonText: '' },
  },
  {
    id: 'MSG005',
    type: '报告完成',
    title: '报告审核通过',
    content: '患者张**的诊断报告已通过质控审核，可正式发布。',
    detail:
      '患者张**（P20240115003）的诊断报告已通过主任医师质控审核，报告结论准确，现已可正式发布或分享给患者。\n\n审核人：李主任\n审核时间：2024/01/15 16:10',
    time: '2024/01/15 16:10',
    read: false,
    sender: '质控中心',
    biz: { type: 'report', targetId: 'R20240115001', label: '诊断报告', buttonText: '查看报告' },
  },
  {
    id: 'MSG006',
    type: '报告完成',
    title: '诊断报告生成完成',
    content: '患者陈**的诊断报告已生成，请查收并确认。',
    detail:
      '患者陈**（P20240114007）的全脊柱正位片分析已完成，诊断报告已自动生成。\n\n报告包含影像所见、诊断印象、结论与建议等内容，请进入报告页确认并提交审核。',
    time: '2024/01/14 15:10',
    read: true,
    sender: 'AI 辅助',
    biz: { type: 'report', targetId: 'R20240115002', label: '诊断报告', buttonText: '查看报告' },
  },
];