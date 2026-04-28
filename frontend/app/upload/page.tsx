'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useUser } from '@/lib/api';
import { getPatients } from '@/services/patientServices';
import { uploadSingleFile } from '@/services/imageServices';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import UploadOptionsOverlay, {
  CropArea,
} from './_components/overlay/upload-options-overlay';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  file: File; // 当前上传用文件，包含已应用的翻转/裁剪
  cropSourceFile: File; // 未裁剪源文件，重新裁剪时从这里生成结果
  flipped: boolean;
  cropped: boolean;
  previewUrl: string; // 列表预览，展示当前上传内容
  sourcePreviewUrl: string; // Overlay 裁剪源预览，保留未裁剪图像
  examType: string;
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/imaging';
  const { isAuthenticated } = useUser();

  const [selectedPatient, setSelectedPatient] = useState('');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [activeOptionsFileId, setActiveOptionsFileId] = useState<string | null>(
    null
  );
  const [optionsQueue, setOptionsQueue] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  const examTypes = [
    '正位X光片',
    '侧位X光片',
    '左侧曲位',
    '右侧曲位',
    '体态照片',
  ];

  const activeOptionsFile = uploadFiles.find(
    file => file.id === activeOptionsFileId
  );

  useEffect(() => {
    if (uploadFiles.length > 0) {
      const completed = uploadFiles.every(file => file.status === 'completed');
      setAllCompleted(completed);
    }
  }, [uploadFiles]);

  // 认证检查
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;

    // 获取患者列表
    const fetchPatients = async () => {
      try {
        const result = await getPatients({ page: 1, page_size: 100 });
        const patientList = result.items.map(patient => ({
          id: patient.id.toString(),
          name: patient.name,
        }));

        setPatients(patientList);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        // 不再使用假数据，认证失败会自动跳转到登录页
        setPatients([]);
      }
    };

    fetchPatients();
  }, [mounted, isAuthenticated]);

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
    const newFiles: UploadFile[] = files.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      const sourcePreviewUrl = URL.createObjectURL(file);
      return {
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0,
        file,
        cropSourceFile: file,
        flipped: false,
        cropped: false,
        previewUrl,
        sourcePreviewUrl,
        examType: examTypes[0],
      };
    });

    setUploadFiles(prev => [...prev, ...newFiles]);

    const newFileIds = newFiles.map(file => file.id);
    if (activeOptionsFileId) {
      setOptionsQueue(prev => [...prev, ...newFileIds]);
    } else {
      const [firstFileId, ...remainingIds] = newFileIds;
      setActiveOptionsFileId(firstFileId ?? null);
      setOptionsQueue(prev => [...prev, ...remainingIds]);
    }
  };

  const handleFileOptionDone = () => {
    const [nextFileId, ...remainingFileIds] = optionsQueue;
    setActiveOptionsFileId(nextFileId ?? null);
    setOptionsQueue(remainingFileIds);
  };

  const updateFileExamType = (fileId: string, nextExamType: string) => {
    setUploadFiles(prev =>
      prev.map(file =>
        file.id === fileId ? { ...file, examType: nextExamType } : file
      )
    );
  };

  const uploadFile = async (uploadFileItem: UploadFile) => {
    try {
      await uploadSingleFile({
        file: uploadFileItem.file,
        patient_id: selectedPatient || null,
        description: uploadFileItem.examType || null,
      });
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFileItem.id
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFileItem.id ? { ...f, status: 'error', progress: 0 } : f
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
    setUploadFiles(prev => {
      const target = prev.find(f => f.id === fileId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.sourcePreviewUrl) URL.revokeObjectURL(target.sourcePreviewUrl);
      return prev.filter(f => f.id !== fileId);
    });
    setOptionsQueue(prev => prev.filter(id => id !== fileId));
    setActiveOptionsFileId(current => (current === fileId ? null : current));
  };

  const replaceCurrentFile = (
    fileId: string,
    newFile: File,
    patch: Partial<Pick<UploadFile, 'cropped'>>
  ) => {
    const newPreviewUrl = URL.createObjectURL(newFile);
    setUploadFiles(prev =>
      prev.map(file => {
        if (file.id !== fileId) return file;
        URL.revokeObjectURL(file.previewUrl);
        return {
          ...file,
          ...patch,
          file: newFile,
          size: newFile.size,
          type: newFile.type || file.type,
          previewUrl: newPreviewUrl,
        };
      })
    );
  };

  const replaceSourceAndCurrentFiles = (
    fileId: string,
    nextSourceFile: File,
    nextCurrentFile: File,
    patch: Partial<Pick<UploadFile, 'flipped'>>
  ) => {
    const nextSourcePreviewUrl = URL.createObjectURL(nextSourceFile);
    const nextPreviewUrl = URL.createObjectURL(nextCurrentFile);
    setUploadFiles(prev =>
      prev.map(file => {
        if (file.id !== fileId) return file;
        URL.revokeObjectURL(file.sourcePreviewUrl);
        URL.revokeObjectURL(file.previewUrl);
        return {
          ...file,
          ...patch,
          file: nextCurrentFile,
          cropSourceFile: nextSourceFile,
          size: nextCurrentFile.size,
          type: nextCurrentFile.type || file.type,
          previewUrl: nextPreviewUrl,
          sourcePreviewUrl: nextSourcePreviewUrl,
        };
      })
    );
  };

  const renderImageToFile = (
    sourceFile: File,
    sourceUrl: string,
    render: (image: HTMLImageElement, canvas: HTMLCanvasElement) => void
  ) =>
    new Promise<File>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        render(image, canvas);
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('无法生成调整后的影像文件'));
            return;
          }
          resolve(
            new File([blob], sourceFile.name, {
              type: sourceFile.type || 'image/png',
            })
          );
        }, sourceFile.type || 'image/png');
      };
      image.onerror = () => reject(new Error('无法读取待调整的影像文件'));
      image.src = sourceUrl;
    });

  // 左右翻转指定文件（Canvas 像素级翻转，生成新 File 对象）
  const handleFlip = async (fileId: string) => {
    const target = uploadFiles.find(file => file.id === fileId);
    if (!target || !target.cropSourceFile.type.startsWith('image/')) return;

    const flipImage = (image: HTMLImageElement, canvas: HTMLCanvasElement) => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
    };

    try {
      const nextSourceFile = await renderImageToFile(
        target.cropSourceFile,
        target.sourcePreviewUrl,
        flipImage
      );
      const nextCurrentFile = target.cropped
        ? await renderImageToFile(target.file, target.previewUrl, flipImage)
        : nextSourceFile;
      replaceSourceAndCurrentFiles(fileId, nextSourceFile, nextCurrentFile, {
        flipped: !target.flipped,
      });
    } catch (error) {
      console.error('Flip image error:', error);
    }
  };

  const handleCrop = async (fileId: string, crop: CropArea) => {
    const target = uploadFiles.find(file => file.id === fileId);
    if (!target || !target.cropSourceFile.type.startsWith('image/')) return;

    try {
      const nextFile = await renderImageToFile(
        target.cropSourceFile,
        target.sourcePreviewUrl,
        (image, canvas) => {
          const sourceX = Math.round(crop.x * image.naturalWidth);
          const sourceY = Math.round(crop.y * image.naturalHeight);
          const sourceWidth = Math.max(
            1,
            Math.round(crop.width * image.naturalWidth)
          );
          const sourceHeight = Math.max(
            1,
            Math.round(crop.height * image.naturalHeight)
          );
          canvas.width = sourceWidth;
          canvas.height = sourceHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            sourceWidth,
            sourceHeight
          );
        }
      );
      replaceCurrentFile(fileId, nextFile, { cropped: true });
    } catch (error) {
      console.error('Crop image error:', error);
    }
  };

  const handleConfirmUpload = () => {
    if (!selectedPatient) {
      alert('请选择患者');
      return;
    }

    console.log('开始上传文件...');

    // 获取所有待上传的文件
    const filesToUpload = uploadFiles.filter(f => f.status === 'pending');

    if (filesToUpload.length === 0) {
      alert('没有文件需要上传');
      return;
    }

    if (filesToUpload.some(file => !file.examType)) {
      alert('请为所有待上传文件选择影像类型');
      return;
    }

    // 将文件状态设置为上传中
    setUploadFiles(prev =>
      prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'uploading' } : f
      )
    );

    // 上传每个文件
    filesToUpload.forEach(uploadFileItem => {
      uploadFile(uploadFileItem);
    });
  };

  const handleBackToSource = () => {
    router.push(returnTo);
  };

  // 如果组件未挂载，显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  // 如果未认证，显示加载状态
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    );
  }

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
            {/* 提示信息 */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
              <i className="ri-information-line w-5 h-5 flex items-center justify-center text-blue-600 mt-0.5 flex-shrink-0"></i>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">提示：</span>默认屏幕左侧对应患者左侧以计算角度正负
              </p>
            </div>

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

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                文件选择后会逐个确认影像类型，可在同一批次中同时上传正位、侧位或其他类别影像。
              </div>
            </div>

            {/* 文件上传区域 */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
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
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {/* 缩略图预览 */}
                      <div className="w-14 h-16 flex-shrink-0 bg-black rounded overflow-hidden">
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </span>
                            {file.status === 'completed' ? (
                              <i className="ri-check-line w-4 h-4 flex items-center justify-center text-green-500"></i>
                            ) : file.status === 'error' ? (
                              <i className="ri-error-warning-line w-4 h-4 flex items-center justify-center text-red-500"></i>
                            ) : file.status === 'uploading' ? (
                              <i className="ri-loader-line w-4 h-4 flex items-center justify-center text-blue-500 animate-spin"></i>
                            ) : (
                              <i className="ri-time-line w-4 h-4 flex items-center justify-center text-gray-500"></i>
                            )}
                            {file.status === 'pending' && (
                              <button
                                onClick={() => setActiveOptionsFileId(file.id)}
                                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                              >
                                调整
                              </button>
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

                        {file.status === 'pending' && (
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-gray-600">待上传</p>
                            <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {file.examType}
                            </span>
                            {file.flipped && (
                              <span className="text-xs text-gray-500">已翻转</span>
                            )}
                            {file.cropped && (
                              <span className="text-xs text-gray-500">已裁剪</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      uploadFiles.forEach(file => {
                        URL.revokeObjectURL(file.previewUrl);
                        URL.revokeObjectURL(file.sourcePreviewUrl);
                      });
                      setUploadFiles([]);
                      setActiveOptionsFileId(null);
                      setOptionsQueue([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    清空列表
                  </button>
                  {allCompleted ? (
                    <button
                      onClick={handleBackToSource}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                    >
                      返回原页面
                    </button>
                  ) : uploadFiles.some(f => f.status === 'uploading') ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed whitespace-nowrap"
                    >
                      上传中...
                    </button>
                  ) : (
                    <button
                      disabled={
                        !selectedPatient ||
                        uploadFiles.some(f => f.status === 'pending' && !f.examType) ||
                        uploadFiles.filter(f => f.status === 'pending')
                          .length === 0
                      }
                      onClick={handleConfirmUpload}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      开始上传
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
              <li>• 每个文件都可以单独选择影像类型，支持同一患者同批次上传正位和侧位影像</li>
              <li>• 支持的文件格式：DCM（DICOM）、JPG、PNG、GIF</li>
              <li>• 单个文件大小不能超过 100MB</li>
              <li>• 支持拖拽上传</li>
              <li>• 若影像左右方向或范围有误，可在文件选择后的弹窗中调整后再上传</li>
              <li>• 上传的文件将自动关联到选中的患者</li>
              <li>• 上传完成后可直接返回原来的页面</li>
            </ul>
          </div>
        </div>
      </main>

      {activeOptionsFile && (
        <UploadOptionsOverlay
          file={{
            id: activeOptionsFile.id,
            name: activeOptionsFile.name,
            previewUrl: activeOptionsFile.sourcePreviewUrl,
            examType: activeOptionsFile.examType,
            flipped: activeOptionsFile.flipped,
            cropped: activeOptionsFile.cropped,
            mimeType: activeOptionsFile.type,
          }}
          examTypes={examTypes}
          onExamTypeChange={updateFileExamType}
          onFlip={handleFlip}
          onCrop={handleCrop}
          onClose={handleFileOptionDone}
          onConfirm={handleFileOptionDone}
        />
      )}
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
