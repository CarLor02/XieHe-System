'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ModelOption {
    id: string;
    name: string;
    view_type: string;
}

export default function ModelSettingsPage() {
    const router = useRouter();
    const [frontModels, setFrontModels] = useState<ModelOption[]>([]);
    const [sideModels, setSideModels] = useState<ModelOption[]>([]);

    const [config, setConfig] = useState({
        front_model_id: '',
        side_model_id: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { createAuthenticatedClient } = await import('@/store/authStore');
            const client = createAuthenticatedClient();

            // Fetch models
            const modelsRes = await client.get('/api/v1/models/', { params: { page_size: 100 } });
            const allModels = modelsRes.data.models || [];

            setFrontModels(allModels.filter((m: any) => m.view_type === 'front'));
            setSideModels(allModels.filter((m: any) => m.view_type === 'side'));

            // Fetch config
            const configRes = await client.get('/api/v1/models/configuration');
            setConfig({
                front_model_id: configRes.data.front_model_id || '',
                side_model_id: configRes.data.side_model_id || ''
            });

        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { createAuthenticatedClient } = await import('@/store/authStore');
            const client = createAuthenticatedClient();

            await client.put('/api/v1/models/configuration', config);
            alert('设置已保存');
            router.push('/model-center');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('保存失败');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <Header />

            <main className="ml-64 p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <i className="ri-arrow-left-line text-xl text-gray-600"></i>
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">模型设置</h1>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8">

                        {/* Front Model Selection */}
                        <div className="pb-8 border-b border-gray-100">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                    <i className="ri-file-user-line text-blue-600 text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">正面模型配置</h2>
                                    <p className="text-gray-500 text-sm">选择处理正面（AP View）X光影像的默认模型</p>
                                </div>
                            </div>

                            <div className="pl-14">
                                <select
                                    value={config.front_model_id}
                                    onChange={(e) => setConfig({ ...config, front_model_id: e.target.value })}
                                    className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    disabled={loading}
                                >
                                    <option value="">-- 请选择模型 --</option>
                                    {frontModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (v{m.id.substring(0, 8)}...)</option>
                                    ))}
                                </select>
                                {frontModels.length === 0 && !loading && (
                                    <p className="text-amber-500 text-sm mt-2">
                                        <i className="ri-alert-line mr-1"></i>
                                        暂无正面模型，请先去添加模型
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Side Model Selection */}
                        <div>
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                                    <i className="ri-file-text-line text-purple-600 text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">侧面模型配置</h2>
                                    <p className="text-gray-500 text-sm">选择处理侧面（Lateral View）X光影像的默认模型</p>
                                </div>
                            </div>

                            <div className="pl-14">
                                <select
                                    value={config.side_model_id}
                                    onChange={(e) => setConfig({ ...config, side_model_id: e.target.value })}
                                    className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    disabled={loading}
                                >
                                    <option value="">-- 请选择模型 --</option>
                                    {sideModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (v{m.id.substring(0, 8)}...)</option>
                                    ))}
                                </select>
                                {sideModels.length === 0 && !loading && (
                                    <p className="text-amber-500 text-sm mt-2">
                                        <i className="ri-alert-line mr-1"></i>
                                        暂无侧面模型，请先去添加模型
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '保存设置'}
                            </button>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
