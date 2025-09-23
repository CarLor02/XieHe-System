
'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TeamManagement from './TeamManagement';
import MemberManagement from './MemberManagement';
import ModelPermissions from './ModelPermissions';
import DataPermissions from './DataPermissions';

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState('team');

  const tabs = [
    { id: 'team', name: '团队管理', icon: 'ri-team-line' },
    { id: 'members', name: '成员管理', icon: 'ri-user-settings-line' },
    { id: 'models', name: '模型权限', icon: 'ri-cpu-line' },
    { id: 'data', name: '数据权限', icon: 'ri-database-line' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
              <p className="text-gray-600 mt-1">管理团队成员和权限设置</p>
            </div>
          </div>

          {/* 标签页导航 */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${tab.icon} w-4 h-4 flex items-center justify-center`}></i>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'team' && <TeamManagement />}
              {activeTab === 'members' && <MemberManagement />}
              {activeTab === 'models' && <ModelPermissions />}
              {activeTab === 'data' && <DataPermissions />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
