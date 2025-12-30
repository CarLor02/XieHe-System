'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import UserSettings from '@/components/UserSettings';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddModelDialog from './AddModelDialog';
import TestModelDialog from './TestModelDialog';
import ModelCard from './ModelCard';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface ModelData {
  id: string;
  title: string;
  description: string;
  view_type: string;
  endpoint_url: string;
  status: string;
  isActive: boolean;
  accuracy: string;
  lastUpdated: string;
  category: string;
  icon: string;
}

export default function ModelCenter() {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.is_system_admin || user?.role === 'admin' || user?.role === 'system_admin' || user?.role === 'team_admin';
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testModel, setTestModel] = useState<{ id: string, name: string } | null>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const { createAuthenticatedClient } = await import('@/store/authStore');
      const client = createAuthenticatedClient();

      const response = await client.get('/api/v1/models/', {
        params: { page_size: 100 }
      });

      try {
        const statsRes = await client.get('/api/v1/models/stats');
        setStats(statsRes.data);
      } catch (e) {
        console.error("Stats fetch failed", e);
      }

      const apiModels = response.data.models || [];
      const convertedModels: ModelData[] = apiModels.map((model: any) => ({
        id: model.id,
        title: model.name,
        description: model.description || '',
        view_type: model.view_type,
        endpoint_url: model.endpoint_url,
        status: model.status || 'ready',
        isActive: model.is_active,
        accuracy: '0%',
        lastUpdated: new Date(model.updated_at).toLocaleDateString('zh-CN'),
        category: model.view_type === 'front' ? '正面' : model.view_type === 'side' ? '侧面' : '其他',
        icon: 'ri-cpu-line'
      }));

      setModels(convertedModels);
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError('加载模型数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const filteredModels = models.filter(m => {
    if (activeTab === 'all') return true;
    return m.view_type === activeTab;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="mb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">模型中心</h1>
              <p className="text-gray-600 mt-1">管理和配置您的AI影像分析模型</p>
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Link href="/model-center/settings" className="text-gray-600 hover:text-blue-600 flex items-center">
                  <i className="ri-settings-3-line mr-1"></i>
                  模型设置
                </Link>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <i className="ri-add-line mr-1"></i>
                  添加模型
                </button>
              )}
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-500 text-sm">总模型数</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_models}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-500 text-sm">活跃模型</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_models}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-500 text-sm">正面视角模型</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.view_distribution?.front || 0}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-500 text-sm">侧面视角模型</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.view_distribution?.side || 0}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'all', label: '全部模型' },
                { id: 'front', label: '正面模型' },
                { id: 'side', label: '侧面模型' },
                { id: 'other', label: '其他' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Model List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredModels.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredModels.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onTestClick={(m) => setTestModel({ id: m.id, name: m.title })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
              <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
              <p className="text-gray-500">暂无该类型的模型数据</p>
              <p className="text-gray-400 text-sm mt-2">Current Tab: {activeTab}, Models loaded: {models.length}</p>
            </div>
          )}
        </div>
      </main>

      <UserSettings
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
        type="profile"
      />

      <AddModelDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={loadModels}
      />

      {testModel && (
        <TestModelDialog
          isOpen={!!testModel}
          modelId={testModel.id}
          modelName={testModel.name}
          onClose={() => setTestModel(null)}
        />
      )}
    </div>
  );
}
