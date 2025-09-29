'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { apiUrl } from '@/lib/config';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/imaging';

  const [selectedPatient, setSelectedPatient] = useState('');
  const [examType, setExamType] = useState('');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>(
    []
  );

  const examTypes = [
    '正位X光片',
    '侧位X光片',
    '左侧曲位',
    '右侧曲位',
    '体态照片',
  ];

  useEffect(() => {
    if (uploadFiles.length > 0) {
      const completed = uploadFiles.every(file => file.status === 'completed');
      setAllCompleted(completed);
    }
  }, [uploadFiles]);

  useEffect(() => {
    // 获取患者列表
    const fetchPatients = async () => {
      try {
        const response = await fetch(apiUrl.patients.list());
        if (response.ok) {
          const data = await response.json();
          setPatients(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        // 使用默认患者列表作为后备
        setPatients([
          { id: 'P202401001', name: '张三' },
          { id: 'P202401002', name: '李四' },
          { id: 'P202401003', name: '王五' },
        ]);
      }
    };

    fetchPatients();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);

    // 上传每个文件
    newFiles.forEach((uploadFileItem, index) => {
      uploadFile(uploadFileItem.id, files[index]);
    });
  };

  const uploadFile = async (fileId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedPatient) {
        formData.append('patient_id', selectedPatient);
      }
      if (examType) {
        formData.append('description', examType);
      }

      const response = await fetch(apiUrl.build('upload/upload/single'), {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
          )
        );
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
        )
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleConfirmUpload = () => {
    console.log('确认上传，返回页面：', returnTo);

    setTimeout(() => {
      router.push(returnTo);
    }, 1000);
  };

  const handleBackToSource = () => {
    router.push(returnTo);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToSource}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <i className="ri-arrow-left-line w-5 h-5 flex items-center justify-center"></i>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">影像上传</h1>
                  <p className="text-gray-600 mt-1">上传患者的医学影像文件</p>
                </div>
              </div>

              {allCompleted && uploadFiles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center space-x-2">
                  <i className="ri-check-line w-5 h-5 flex items-center justify-center text-green-600"></i>
                  <span className="text-green-800 text-sm">
                    所有文件上传完成
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* 患者和检查信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择患者 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPatient}
                  onChange={e => setSelectedPatient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                >
                  <option value="">请选择患者</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({patient.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  检查类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                >
                  <option value="">请选择检查类型</option>
                  {examTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 文件上传区域 */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="max-w-md mx-auto">
                <i className="ri-cloud-upload-line w-12 h-12 flex items-center justify-center mx-auto mb-4 text-gray-400 text-4xl"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  拖拽文件到此处，或点击选择文件
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  支持 DCM, JPG, PNG, GIF 格式，单个文件最大 100MB
                </p>

                <input
                  type="file"
                  multiple
                  accept=".dcm,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-upload-line w-4 h-4 flex items-center justify-center mr-2"></i>
                  选择文件
                </label>
              </div>
            </div>

            {/* 上传文件列表 */}
            {uploadFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  上传文件 ({uploadFiles.length})
                </h3>
                <div className="space-y-3">
                  {uploadFiles.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                            {file.status === 'completed' ? (
                              <i className="ri-check-line w-4 h-4 flex items-center justify-center text-green-500"></i>
                            ) : file.status === 'error' ? (
                              <i className="ri-error-warning-line w-4 h-4 flex items-center justify-center text-red-500"></i>
                            ) : (
                              <i className="ri-loader-line w-4 h-4 flex items-center justify-center text-blue-500 animate-spin"></i>
                            )}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                            </button>
                          </div>
                        </div>

                        {file.status === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                        )}

                        {file.status === 'completed' && (
                          <p className="text-xs text-green-600">上传完成</p>
                        )}

                        {file.status === 'error' && (
                          <p className="text-xs text-red-600">上传失败</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setUploadFiles([])}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    清空列表
                  </button>
                  {allCompleted ? (
                    <button
                      onClick={handleBackToSource}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 whitespace-nowrap"
                    >
                      <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center"></i>
                      <span>返回原页面</span>
                    </button>
                  ) : (
                    <button
                      disabled={!selectedPatient || !examType}
                      onClick={handleConfirmUpload}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      确认上传
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 上传说明 */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              上传说明
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 请确保选择正确的患者和检查类型</li>
              <li>• 支持的文件格式：DCM（DICOM）、JPG、PNG、GIF</li>
              <li>• 单个文件大小不能超过 100MB</li>
              <li>• 支持批量选择和拖拽上传</li>
              <li>• 上传的文件将自动关联到选中的患者</li>
              <li>• 上传完成后可直接返回原来的页面</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UploadContent />
    </Suspense>
  );
}
