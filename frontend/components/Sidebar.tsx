'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: '主页', href: '/', icon: 'ri-home-line' },
  { name: '工作台', href: '/dashboard', icon: 'ri-dashboard-line' },
  { name: '患者管理', href: '/patients', icon: 'ri-user-line' },
  { name: '影像中心', href: '/imaging', icon: 'ri-image-line' },
  { name: '上传影像', href: '/upload', icon: 'ri-upload-line' },
  { name: '模型中心', href: '/model-center', icon: 'ri-cpu-line' },
  { name: '权限管理', href: '/permissions', icon: 'ri-shield-user-line' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-56 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="flex items-center px-4 py-4 border-b border-gray-200">
        <div className="font-['Pacifico'] text-xl text-blue-600">Mesh</div>
        <span className="ml-2 text-gray-800 font-medium text-sm">智慧门诊</span>
      </div>

      {/* Navigation */}
      <nav className="mt-6">
        {navigation.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : ''
              }`}
            >
              <i
                className={`${item.icon} w-5 h-5 flex items-center justify-center`}
              ></i>
              <span className="ml-3 whitespace-nowrap text-sm">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
