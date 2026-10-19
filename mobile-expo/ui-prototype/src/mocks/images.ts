
// 按检查类型区分缩略图
// 正面：脊柱正位 X 光（frontal/AP view）
// 侧面：脊柱侧位 X 光（lateral view）
// 左侧曲位/右侧曲位：弯曲位 X 光（bending view）

const thumbnailByType: Record<string, string> = {
  '正面': 'https://readdy.ai/api/search-image?query=spine%20frontal%20AP%20view%20X-ray%20full%20spine%20scoliosis%20upright%20standing%20black%20background%20medical%20radiology%20high%20contrast&width=56&height=56&seq=frontal_thumb_01&orientation=squarish',
  '侧面': 'https://readdy.ai/api/search-image?query=spine%20lateral%20side%20view%20X-ray%20full%20spine%20lumbar%20cervical%20black%20background%20medical%20radiology%20high%20contrast&width=56&height=56&seq=lateral_thumb_01&orientation=squarish',
  '左侧曲位': 'https://readdy.ai/api/search-image?query=spine%20left%20bending%20view%20X-ray%20scoliosis%20flexibility%20black%20background%20medical%20radiology&width=56&height=56&seq=leftbend_thumb_01&orientation=squarish',
  '右侧曲位': 'https://readdy.ai/api/search-image?query=spine%20right%20bending%20view%20X-ray%20scoliosis%20flexibility%20black%20background%20medical%20radiology&width=56&height=56&seq=rightbend_thumb_01&orientation=squarish',
};

export const imagesData = [
  {
    id: 'IMG001',
    fileName: '20240115_spine_frontal.png',
    patientName: '王**',
    patientId: 'P20240115001',
    checkType: '正面',
    status: '已上传',
    uploadTime: '2024/01/15 14:30',
    thumbnailUrl: thumbnailByType['正面'],
  },
  {
    id: 'IMG002',
    fileName: '20240115_spine_lateral.png',
    patientName: '李**',
    patientId: 'P20240115002',
    checkType: '侧面',
    status: '处理中',
    uploadTime: '2024/01/15 13:45',
    thumbnailUrl: thumbnailByType['侧面'],
  },
  {
    id: 'IMG003',
    fileName: '20240115_spine_left_bend.dcm',
    patientName: '张**',
    patientId: 'P20240115003',
    checkType: '左侧曲位',
    status: '已完成',
    uploadTime: '2024/01/15 11:20',
    thumbnailUrl: thumbnailByType['左侧曲位'],
  },
  {
    id: 'IMG004',
    fileName: '20240114_spine_right_bend.dcm',
    patientName: '刘**',
    patientId: 'P20240114008',
    checkType: '右侧曲位',
    status: '已上传',
    uploadTime: '2024/01/14 16:55',
    thumbnailUrl: thumbnailByType['右侧曲位'],
  },
  {
    id: 'IMG005',
    fileName: '20240114_spine_frontal3.dcm',
    patientName: '陈**',
    patientId: 'P20240114007',
    checkType: '正面',
    status: '已完成',
    uploadTime: '2024/01/14 15:10',
    thumbnailUrl: thumbnailByType['正面'],
  },
  {
    id: 'IMG006',
    fileName: '20240113_spine_frontal2.dcm',
    patientName: '赵**',
    patientId: 'P20240113015',
    checkType: '正面',
    status: '处理中',
    uploadTime: '2024/01/13 10:25',
    thumbnailUrl: thumbnailByType['正面'],
  }
];