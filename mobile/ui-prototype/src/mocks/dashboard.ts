export const statsData = [
  {
    label: '总患者数',
    value: '1,248',
    change: '+12',
    icon: 'ri-user-heart-line',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-300/50'
  },
  {
    label: '总影像数',
    value: '2,156',
    change: '+28',
    icon: 'ri-scan-line',
    gradient: 'from-sky-400 to-blue-500',
    shadow: 'shadow-sky-300/50'
  }
];

export const pendingTasks = [
  {
    id: 'T001',
    imageId: 'IMG001',
    patientName: '王小明',
    patientId: 'P20240115001',
    imageType: '正面',
    priority: 'high',
    createTime: '14:30'
  },
  {
    id: 'T002',
    imageId: 'IMG002',
    patientName: '李雨晴',
    patientId: 'P20240115002',
    imageType: '侧面',
    priority: 'medium',
    createTime: '13:45'
  },
  {
    id: 'T003',
    imageId: 'IMG003',
    patientName: '张伟',
    patientId: 'P20240115003',
    imageType: '左侧曲位',
    priority: 'high',
    createTime: '11:20'
  },
  {
    id: 'T004',
    imageId: 'IMG005',
    patientName: '刘思远',
    patientId: 'P20240114008',
    imageType: '正面',
    priority: 'low',
    createTime: '昨天 16:55'
  },
  {
    id: 'T005',
    imageId: 'IMG004',
    patientName: '陈美华',
    patientId: 'P20240114007',
    imageType: '右侧曲位',
    priority: 'medium',
    createTime: '昨天 15:10'
  }
];

export const recentActivities = [
  {
    id: 'A001',
    type: 'complete',
    icon: 'ri-checkbox-circle-fill',
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    title: '完成影像标注',
    desc: '患者 赵丽华 · 正面',
    time: '10分钟前'
  },
  {
    id: 'A002',
    type: 'upload',
    icon: 'ri-upload-cloud-fill',
    iconColor: 'text-violet-500',
    bgColor: 'bg-violet-50',
    title: '新影像上传',
    desc: '患者 孙建国 · 侧面 + 正面',
    time: '32分钟前'
  },
  {
    id: 'A003',
    type: 'report',
    icon: 'ri-file-text-fill',
    iconColor: 'text-sky-500',
    bgColor: 'bg-sky-50',
    title: '生成分析报告',
    desc: '患者 周晓燕 · Cobb角 24°',
    time: '1小时前'
  },
  {
    id: 'A004',
    type: 'new',
    icon: 'ri-user-add-fill',
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    title: '新增患者档案',
    desc: '患者 吴明辉 · 已建档',
    time: '2小时前'
  }
];

export const quickActions = [
  { label: '新增患者', icon: 'ri-user-add-line', route: '/patients/add', color: 'from-violet-500 to-purple-500' },
  { label: '上传影像', icon: 'ri-upload-2-line', route: '/images/upload', color: 'from-sky-400 to-blue-500' },
  { label: '影像中心', icon: 'ri-scan-line', route: '/images', color: 'from-emerald-400 to-teal-500' },
  { label: '消息通知', icon: 'ri-notification-3-line', route: '/messages', color: 'from-orange-400 to-rose-500' }
];
