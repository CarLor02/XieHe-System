
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsData } from '../../../mocks/patients';
import { imagesData } from '../../../mocks/images';

export default function PatientDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const patient = patientsData.find(p => p.id === id) || patientsData[0];
  const patientImages = imagesData.filter(img => img.patientId === patient.id);
  
  const allImages = [
    ...patientImages,
    { id: 'IMG101', fileName: '885545_全脊柱侧位.png', patientId: patient.id, checkType: 'XR', status: '已处理', uploadTime: '2026/01/14 09:30' },
    { id: 'IMG102', fileName: '287256_全脊柱正位.png', patientId: patient.id, checkType: 'XR', status: '已上传', uploadTime: '2026/01/14 09:25' },
    { id: 'IMG103', fileName: '507566_全脊柱侧位.png', patientId: patient.id, checkType: 'XR', status: '已上传', uploadTime: '2026/01/14 08:50' },
    { id: 'IMG104', fileName: 'cemian.jpg', patientId: patient.id, checkType: 'XR', status: '已上传', uploadTime: '2026/01/13 16:20' }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '已处理': case '已完成': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case '已上传': return 'bg-violet-50 text-violet-600 border-violet-200';
      case '处理中': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/patients')}
              className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white mr-3"
            >
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <div>
              <h1 className="text-white text-lg font-bold">患者详情</h1>
              <p className="text-violet-100 text-xs mt-0.5">查看和管理患者完整信息</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/patients/edit/${patient.id}`)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium"
            >
              编辑信息
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-500/80 backdrop-blur-sm rounded-full text-white text-sm font-medium"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">基本信息</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              patient.status === '活跃' 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {patient.status === '活跃' ? '活跃' : '非活跃'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-400 mb-1">姓名</p><p className="text-sm font-semibold text-slate-800">{patient.name}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">患者编号</p><p className="text-sm font-semibold text-slate-800">{patient.id}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">性别</p><p className="text-sm font-semibold text-slate-800">{patient.gender}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">出生日期</p><p className="text-sm font-semibold text-slate-800">1985年3月15日</p></div>
            <div><p className="text-xs text-slate-400 mb-1">年龄</p><p className="text-sm font-semibold text-slate-800">{patient.age}岁</p></div>
            <div><p className="text-xs text-slate-400 mb-1">联系电话</p><p className="text-sm font-semibold text-slate-800">{patient.phone}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">电子邮箱</p><p className="text-sm font-semibold text-slate-800">{patient.email}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">身份证号码</p><p className="text-sm font-semibold text-slate-800">{patient.idCard}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">医保卡号</p><p className="text-sm font-semibold text-slate-800">{patient.insurance}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">家庭地址</p><p className="text-sm font-semibold text-slate-800">{patient.address}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">紧急联系人</p><p className="text-sm font-semibold text-slate-800">{patient.emergencyContact}</p></div>
            <div><p className="text-xs text-slate-400 mb-1">紧急联系电话</p><p className="text-sm font-semibold text-slate-800">{patient.emergencyPhone}</p></div>
          </div>
        </div>

        {/* 就诊统计和医疗信息 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-3">就诊统计</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">影像数量</span>
                <span className="text-sm font-bold text-violet-600">{allImages.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">最近上传</span>
                <span className="text-xs font-medium text-slate-600">{allImages.length > 0 ? allImages[0].uploadTime.split(' ')[0] : '暂无记录'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">建档时间</span>
                <span className="text-xs font-medium text-slate-600">2026/01/05</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 mb-3">医疗信息</h2>
            <div>
              <p className="text-xs text-slate-400 mb-1">既往病史</p>
              <p className="text-xs text-slate-600 leading-relaxed">{patient.medicalHistory || '暂无病史记录'}</p>
            </div>
          </div>
        </div>

        {/* 影像记录 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">影像记录</h2>
            <button 
              onClick={() => navigate('/images/add')}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium rounded-full shadow-md shadow-violet-500/30"
            >
              <i className="ri-upload-2-line mr-1"></i>
              上传图片
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2 py-2 border-b border-slate-100 mb-2">
            <div className="col-span-3 text-xs text-slate-400 font-medium">上传日期</div>
            <div className="col-span-4 text-xs text-slate-400 font-medium">文件名</div>
            <div className="col-span-2 text-xs text-slate-400 font-medium">类型</div>
            <div className="col-span-2 text-xs text-slate-400 font-medium">状态</div>
            <div className="col-span-1 text-xs text-slate-400 font-medium">操作</div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allImages.map((image) => (
              <div key={image.id} className="grid grid-cols-12 gap-2 py-3 border-b border-slate-50 items-center hover:bg-slate-50 rounded-lg transition-colors">
                <div className="col-span-3 text-xs text-slate-600">{image.uploadTime.split(' ')[0]}</div>
                <div className="col-span-4 text-xs text-slate-800 font-medium truncate">{image.fileName}</div>
                <div className="col-span-2">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-semibold rounded-full border border-purple-200">{image.checkType}</span>
                </div>
                <div className="col-span-2">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusStyle(image.status)}`}>{image.status}</span>
                </div>
                <div className="col-span-1">
                  <button onClick={() => navigate('/image-annotation')} className="text-violet-500 text-xs font-medium hover:text-violet-600">查看</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-8" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white w-full rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-delete-bin-line text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">确认删除患者？</h3>
            <p className="text-sm text-slate-500 text-center mb-6">删除后将无法恢复该患者的所有信息和影像记录</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium">取消</button>
              <button onClick={() => { setShowDeleteConfirm(false); navigate('/patients'); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
