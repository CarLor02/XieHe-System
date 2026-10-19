import { useNavigate, useLocation } from 'react-router-dom';

interface TabItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  activeIcon: string;
}

const tabs: TabItem[] = [
  { key: 'dashboard', label: '工作台', path: '/dashboard', icon: 'ri-dashboard-line', activeIcon: 'ri-dashboard-fill' },
  { key: 'patients', label: '患者中心', path: '/patients', icon: 'ri-user-heart-line', activeIcon: 'ri-user-heart-fill' },
  { key: 'images', label: '影像中心', path: '/images', icon: 'ri-image-line', activeIcon: 'ri-image-fill' },
  { key: 'profile', label: '个人中心', path: '/profile', icon: 'ri-user-line', activeIcon: 'ri-user-fill' },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab: TabItem) => {
    const current = location.pathname;
    if (tab.path === '/dashboard') return current === '/' || current === '/dashboard';
    return current.startsWith(tab.path);
  };

  return (
    <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-2 py-2 grid grid-cols-4 z-30 flex-shrink-0">
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center py-1.5"
          >
            <div
              className={`w-10 h-10 flex items-center justify-center ${
                active ? 'bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30' : ''
              }`}
            >
              <i className={`${active ? tab.activeIcon : tab.icon} ${active ? 'text-white text-lg' : 'text-slate-400 text-xl'}`}></i>
            </div>
            <span className={`text-[10px] mt-1 ${active ? 'font-semibold text-violet-600' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}