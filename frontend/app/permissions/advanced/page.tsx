'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PermissionManager from '@/components/permissions/PermissionManager';
import React from 'react';

const AdvancedPermissionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16 p-6">
        <div className="max-w-7xl mx-auto">
          {/* 权限管理组件 */}
          <PermissionManager />
        </div>
      </main>
    </div>
  );
};

export default AdvancedPermissionsPage;
