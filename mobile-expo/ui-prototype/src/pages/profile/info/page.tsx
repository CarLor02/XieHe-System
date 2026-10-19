import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserInfo {
  name: string;
  position: string;
  email: string;
  phone: string;
  department: string;
  employeeId: string;
}

const defaultInfo: UserInfo = {
  name: '张医生',
  position: '主治医师',
  email: 'zhang.doctor@hospital.com',
  phone: '13812345678',
  department: '脊柱外科',
  employeeId: 'EMP-20240315',
};

export default function ProfileInfo() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<UserInfo>(defaultInfo);
  const [editing, setEditing] = useState<Partial<Record<keyof UserInfo, boolean>>>({});
  const [draft, setDraft] = useState<UserInfo>(defaultInfo);
  const [toastMsg, setToastMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ''));
      showToast('头像已更新');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const fields: { key: keyof UserInfo; label: string; icon: string; editable: boolean; type?: string }[] = [
    { key: 'name', label: '姓名', icon: 'ri-user-line', editable: true },
    { key: 'position', label: '职位', icon: 'ri-briefcase-line', editable: true },
    { key: 'department', label: '科室', icon: 'ri-hospital-line', editable: true },
    { key: 'email', label: '邮箱', icon: 'ri-mail-line', editable: true, type: 'email' },
    { key: 'phone', label: '手机号', icon: 'ri-phone-line', editable: true, type: 'tel' },
  ];

  const startEdit = (key: keyof UserInfo) => {
    setDraft(prev => ({ ...prev, [key]: info[key] }));
    setEditing(prev => ({ ...prev, [key]: true }));
  };

  const cancelEdit = (key: keyof UserInfo) => {
    setDraft(prev => ({ ...prev, [key]: info[key] }));
    setEditing(prev => ({ ...prev, [key]: false }));
  };

  const saveEdit = (key: keyof UserInfo) => {
    setInfo(prev => ({ ...prev, [key]: draft[key] }));
    setEditing(prev => ({ ...prev, [key]: false }));
    showToast('修改已保存');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">个人信息</h1>
            <p className="text-violet-100 text-xs mt-0.5">查看和修改您的个人资料</p>
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 头像区域 */}
        <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <i className="ri-user-line text-white text-3xl"></i>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={handleAvatarPick}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-md border-2 border-white active:scale-95 transition-transform"
            >
              <i className="ri-camera-line text-white text-xs"></i>
            </button>
          </div>
          <h2 className="text-base font-bold text-slate-800">{info.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold rounded-full">
              {info.position}
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">
              已认证
            </span>
          </div>
        </div>

        {/* 信息列表 */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
            <h3 className="text-sm font-bold text-slate-800">基本资料</h3>
          </div>
          {fields.map((field, index) => (
            <div key={field.key} className={`px-4 py-4 ${index !== fields.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className={`${field.icon} text-violet-500 text-base`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">{field.label}</p>
                    {editing[field.key] ? (
                      <input
                        type={field.type || 'text'}
                        value={draft[field.key]}
                        onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full text-sm font-semibold text-slate-800 border-b-2 border-violet-400 bg-transparent outline-none pb-0.5 focus:border-violet-600 transition-colors"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-800 truncate">{info[field.key]}</p>
                    )}
                  </div>
                </div>
                {field.editable && (
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {editing[field.key] ? (
                      <>
                        <button onClick={() => cancelEdit(field.key)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <i className="ri-close-line text-slate-500 text-base"></i>
                        </button>
                        <button onClick={() => saveEdit(field.key)} className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-violet-300/40">
                          <i className="ri-check-line text-white text-base"></i>
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(field.key)} className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                        <i className="ri-edit-line text-slate-400 text-base"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 成功提示 Toast */}
      <div className={`absolute top-28 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="bg-slate-800/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2.5 rounded-full flex items-center gap-2 shadow-xl">
          <i className="ri-checkbox-circle-fill text-emerald-400 text-sm"></i>
          {toastMsg || '修改已保存'}
        </div>
      </div>
    </div>
  );
}
