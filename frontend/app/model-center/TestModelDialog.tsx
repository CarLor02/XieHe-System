import { useState, useRef } from 'react';
import Image from 'next/image';

interface TestModelDialogProps {
    modelId: string;
    modelName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function TestModelDialog({ modelId, modelName, isOpen, onClose }: TestModelDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setResultImage(null);
            setError(null);
        }
    };

    const handleTest = async () => {
        if (!selectedFile) return;

        setLoading(true);
        setError(null);

        try {
            const { createAuthenticatedClient } = await import('@/store/authStore');
            const client = createAuthenticatedClient();

            const formData = new FormData();
            formData.append('files', selectedFile);

            const response = await client.post(`/api/v1/models/${modelId}/test`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success && response.data.result_image) {
                setResultImage(response.data.result_image);
            } else {
                setError('测试完成，但未返回结果图片');
                console.warn('Response:', response.data);
            }
        } catch (err: any) {
            console.error('Failed to test model:', err);
            setError(err.response?.data?.detail || '模型测试失败');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResultImage(null);
        setError(null);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">模型测试: {modelName}</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <i className="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="flex flex-col border-r border-gray-200 pr-6">
                        <h3 className="text-lg font-medium mb-3">输入图片</h3>
                        <div
                            className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${previewUrl ? 'border-gray-300' : 'border-blue-300 hover:bg-blue-50'}`}
                            onClick={() => !previewUrl && fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />

                            {previewUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden group">
                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                            className="hidden group-hover:block bg-white text-gray-800 px-4 py-2 rounded-lg shadow-sm font-medium"
                                        >
                                            更换图片
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-6">
                                    <i className="ri-upload-cloud-2-line text-4xl text-blue-500 mb-2"></i>
                                    <p className="text-gray-600 font-medium">点击上传测试图片</p>
                                    <p className="text-gray-400 text-sm mt-1">支持 PNG, JPG, DICOM 格式</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Output Section */}
                    <div className="flex flex-col">
                        <h3 className="text-lg font-medium mb-3">测试结果</h3>
                        <div className="flex-1 bg-gray-50 rounded-lg flex items-center justify-center relative border border-gray-200">
                            {loading ? (
                                <div className="text-center">
                                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-gray-600">正在推理中...</p>
                                </div>
                            ) : resultImage ? (
                                <div className="w-full h-full flex items-center justify-center p-2">
                                    <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain shadow-sm rounded" />
                                </div>
                            ) : error ? (
                                <div className="text-center text-red-500 p-4">
                                    <i className="ri-error-warning-line text-3xl mb-2"></i>
                                    <p>{error}</p>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>结果将在此处显示</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        关闭
                    </button>
                    <button
                        onClick={handleTest}
                        disabled={!selectedFile || loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? '处理中...' : (
                            <>
                                <i className="ri-play-circle-line mr-2"></i>
                                开始测试
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
