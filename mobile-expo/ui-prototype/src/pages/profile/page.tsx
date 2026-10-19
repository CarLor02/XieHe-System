import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/feature/PageHeader';
import BottomTabBar from '@/components/feature/BottomTabBar';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import Toast from '@/components/base/Toast';

export default function Profile() {
  const navigate = useNavigate();
  const [showBadge, setShowBadge] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleLogout = () => {
    setShowLogout(false);
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const menuItems = [
    { icon: 'ri-user-line', label: '个人信息', path: '/profile/info', color: 'from-violet-400 to-violet-500' },
    { icon: 'ri-building-line', label: '组织管理', path: '/profile/organization', color: 'from-purple-400 to-purple-500' },
    { icon: 'ri-lock-password-line', label: '修改密码', path: '/profile/password', color: 'from-amber-400 to-amber-500' },
    { icon: 'ri-settings-3-line', label: '系统设置', path: '/profile/settings', color: 'from-emerald-400 to-emerald-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* 顶部导航栏 */}
      <PageHeader
        title="个人中心"
        roundedBottom
        right={
          <button 
            onClick={() => navigate('/messages')}
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white relative active:scale-95 transition-transform"
          >
            <i className="ri-notification-3-line text-lg"></i>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-violet-500"></span>
          </button>
        }
      />

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl p-5 shadow-xl shadow-slate-200/50 border border-slate-100 mb-4">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-violet-500/30">
              <i className="ri-user-line text-white text-2xl"></i>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800 mb-1">admin</h2>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold rounded-full shadow-sm">
                  医生
                </span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                  已认证
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowBadge(true)}
              className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform border border-slate-100"
            >
              <i className="ri-qr-code-line text-slate-500"></i>
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={() => navigate('/patients')} className="text-center active:opacity-60 transition-opacity">
              <div className="text-xl font-bold text-slate-800">128</div>
              <div className="text-xs text-slate-500 mt-0.5">管理患者</div>
            </button>
            <button onClick={() => navigate('/messages')} className="text-center border-x border-slate-100 active:opacity-60 transition-opacity">
              <div className="text-xl font-bold text-slate-800">56</div>
              <div className="text-xs text-slate-500 mt-0.5">本月审核</div>
            </button>
            <button onClick={() => navigate('/images')} className="text-center active:opacity-60 transition-opacity">
              <div className="text-xl font-bold text-slate-800">98%</div>
              <div className="text-xs text-slate-500 mt-0.5">完成率</div>
            </button>
          </div>
        </div>

        {/* 功能菜单 */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden mb-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mr-3 shadow-md`}>
                  <i className={`${item.icon} text-white text-lg`}></i>
                </div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
              <i className="ri-arrow-right-s-line text-slate-300 text-xl"></i>
            </button>
          ))}
        </div>

        {/* 退出登录按钮 */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full py-3.5 bg-white text-red-500 rounded-2xl text-sm font-semibold shadow-lg shadow-slate-200/50 border border-slate-100 hover:bg-red-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <i className="ri-logout-box-r-line"></i>
          退出登录
        </button>
      </div>

      {/* 电子工牌弹层 */}
      {showBadge && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end"
          onClick={() => setShowBadge(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">电子工牌</h3>
              <button
                onClick={() => setShowBadge(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-violet-300/40">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <i className="ri-user-line text-white text-2xl"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-base font-bold">admin</p>
                <p className="text-violet-100 text-xs mt-0.5">脊柱外科 · 主治医师</p>
                <p className="text-violet-200 text-[10px] mt-1 font-mono">EMP-20240315</p>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 rounded-2xl p-5 flex flex-col items-center border border-slate-100">
              <div className="w-40 h-40 rounded-xl overflow-hidden bg-white shadow-inner flex items-center justify-center">
                <img
                  src="https://readdy.ai/api/search-image?query=Minimalist%20black%20and%20white%20QR%20code%20pattern%20centered%20on%20clean%20white%20paper%2C%20flat%20top%20down%20view%2C%20crisp%20sharp%20squares%2C%20high%20contrast%2C%20no%20text%2C%20simple%20modern%20graphic%20design&width=320&height=320&seq=badge-qr-2026a&orientation=squarish"
                  alt="电子工牌二维码"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-slate-400 mt-3">院内扫码枪或手机相机扫描可查看电子工牌</p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => showToast('二维码已保存到相册')}
                className="flex-1 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl active:scale-[0.98] transition-transform"
              >
                <i className="ri-download-2-line mr-1"></i>
                保存图片
              </button>
              <button
                onClick={() => showToast('二维码已刷新')}
                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-300/40 active:scale-[0.98] transition-transform"
              >
                <i className="ri-refresh-line mr-1"></i>
                刷新二维码
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogout}
        title="确定退出登录？"
        description="退出后需要重新登录才能继续查看患者与影像数据。"
        confirmText="退出登录"
        danger
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />

      {toast && <Toast message={toast} />}

      {/* 底部导航栏 */}
      <BottomTabBar />
    </div>
  );
}