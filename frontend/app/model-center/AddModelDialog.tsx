import { useState } from 'react';

interface AddModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddModelDialog({ isOpen, onClose, onSuccess }: AddModelDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        view_type: 'other',
        endpoint_url: '',
        version: '1.0.0',
        tags: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { createAuthenticatedClient } = await import('@/store/authStore');
            const client = createAuthenticatedClient();

            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            };

            await client.post('/api/v1/models/', payload);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to create model:', err);
            setError(err.response?.data?.detail || '创建模型失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">添加新模型</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="ri-close-line text-2xl"></i>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">模型名称 *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例如：脊柱正面分析模型 v1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">模型类型 *</label>
                        <select
                            value={formData.view_type}
                            onChange={(e) => setFormData({ ...formData, view_type: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="front">正面 (Front)</option>
                            <option value="side">侧面 (Side)</option>
                            <option value="other">其他 (Other)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">推理服务地址 *</label>
                        <input
                            type="url"
                            required
                            value={formData.endpoint_url}
                            onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="http://remote-gpu-server:8000/predict"
                        />
                        <p className="text-xs text-gray-500 mt-1">API服务的完整URL地址</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                        <input
                            type="text"
                            value={formData.version}
                            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="用逗号分隔，例如：脊柱, 深度学习"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {loading ? '提交中...' : '添加模型'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
