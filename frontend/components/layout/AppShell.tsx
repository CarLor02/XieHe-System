'use client';

import { ReactNode, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface AppShellProps {
  children: ReactNode;
  mainClassName?: string;
  contentClassName?: string;
}

export default function AppShell({
  children,
  mainClassName = '',
  contentClassName = '',
}: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={`min-h-screen bg-gray-50 ${contentClassName}`}>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        <Sidebar className="h-full w-full" />
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="absolute inset-0 bg-black/50"
            onClick={closeSidebar}
          />
          <aside
            aria-label="移动端导航菜单"
            className="relative h-full w-64 max-w-[calc(100vw-3rem)] bg-white shadow-xl"
          >
            <Sidebar className="h-full w-full" onNavigate={closeSidebar} />
          </aside>
        </div>
      )}

      <div data-testid="app-shell-content" className="min-h-screen lg:pl-64">
        <Header showMenuButton onOpenSidebar={() => setIsSidebarOpen(true)} />
        <main className={`p-4 sm:p-6 ${mainClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
