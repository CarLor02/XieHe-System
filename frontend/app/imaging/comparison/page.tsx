/**
 * 影像对比页面
 *
 * 提供多影像对比功能的专用页面
 *
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ImageComparison, {
  ComparisonMode,
} from '@/components/medical/ImageComparison';
import { createAuthenticatedClient } from '@/store/authStore';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

interface ImageData {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  metadata: {
    patientName: string;
    studyDate: string;
    modality: string;
    windowCenter: number;
    windowWidth: number;
    rows: number;
    columns: number;
  };
}

// 备用影像数据（当API调用失败时使用）
const fallbackImages: ImageData[] = [
  {
    id: 'IMG001',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '胸部CT - 横断面',
    description: '患者张某，胸部CT扫描',
    metadata: {
      patientName: '张某',
      studyDate: '2025-09-25',
      modality: 'CT',
      windowCenter: 40,
      windowWidth: 400,
      rows: 512,
      columns: 512,
    },
  },
  {
    id: 'IMG002',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '胸部CT - 冠状面',
    description: '患者张某，胸部CT扫描冠状面重建',
    metadata: {
      patientName: '张某',
      studyDate: '2025-09-25',
      modality: 'CT',
      windowCenter: 40,
      windowWidth: 400,
      rows: 512,
      columns: 512,
    },
  },
  {
    id: 'IMG003',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '胸部CT - 矢状面',
    description: '患者张某，胸部CT扫描矢状面重建',
    metadata: {
      patientName: '张某',
      studyDate: '2025-09-25',
      modality: 'CT',
      windowCenter: 40,
      windowWidth: 400,
      rows: 512,
      columns: 512,
    },
  },
  {
    id: 'IMG004',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '胸部X光 - 正位',
    description: '患者张某，胸部X光正位片',
    metadata: {
      patientName: '张某',
      studyDate: '2025-09-24',
      modality: 'CR',
      windowCenter: 128,
      windowWidth: 256,
      rows: 2048,
      columns: 2048,
    },
  },
  {
    id: 'IMG005',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '胸部X光 - 侧位',
    description: '患者张某，胸部X光侧位片',
    metadata: {
      patientName: '张某',
      studyDate: '2025-09-24',
      modality: 'CR',
      windowCenter: 128,
      windowWidth: 256,
      rows: 2048,
      columns: 2048,
    },
  },
  {
    id: 'IMG006',
    url: '/api/placeholder/512/512',
    thumbnailUrl: '/api/placeholder/128/128',
    title: '腹部CT - 平扫',
    description: '患者李某，腹部CT平扫',
    metadata: {
      patientName: '李某',
      studyDate: '2025-09-25',
      modality: 'CT',
      windowCenter: 50,
      windowWidth: 350,
      rows: 512,
      columns: 512,
    },
  },
];

const ImageComparisonContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedMode, setSelectedMode] = useState<ComparisonMode>(
    ComparisonMode.SIDE_BY_SIDE
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从URL参数获取预选影像
  useEffect(() => {
    const imageIds = searchParams.get('images')?.split(',') || [];
    if (imageIds.length > 0) {
      // 这里可以根据ID筛选影像
      console.log('预选影像ID:', imageIds);
    }
  }, [searchParams]);

  // 加载影像数据
  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = createAuthenticatedClient();
      const response = await client.get('/api/v1/studies/?page=1&page_size=20');

      // 转换API数据为ImageData格式
      const studies = response.data.studies || [];
      const imageData: ImageData[] = studies.map((study: any) => ({
        id: `IMG${study.id.toString().padStart(3, '0')}`,
        url: `https://readdy.ai/api/search-image?query=medical%20${study.modality || 'imaging'}%20professional%20radiological%20image&width=512&height=512&seq=${study.id}&orientation=square`,
        thumbnailUrl: `https://readdy.ai/api/search-image?query=medical%20${study.modality || 'imaging'}%20professional%20radiological%20image&width=128&height=128&seq=${study.id}&orientation=square`,
        title: `${study.modality || '未知'} - ${study.study_description || '影像检查'}`,
        description: `患者${study.patient_name || '未知'}，${study.study_description || '影像检查'}`,
        metadata: {
          patientName: study.patient_name || '未知患者',
          studyDate:
            study.study_date || study.created_at?.split('T')[0] || '未知日期',
          modality: study.modality || 'Unknown',
          windowCenter: study.modality === 'CT' ? 40 : 128,
          windowWidth: study.modality === 'CT' ? 400 : 256,
          rows: 512,
          columns: 512,
        },
      }));

      setImages(imageData);
    } catch (err) {
      console.error('Failed to load images:', err);
      const errorMessage =
        err instanceof Error ? err.message : '加载影像数据失败';
      setError(errorMessage);
      // 使用备用数据
      setImages(fallbackImages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (imageId: string) => {
    console.log('选中影像:', imageId);
  };

  const handleModeChange = (mode: ComparisonMode) => {
    setSelectedMode(mode);
    console.log('切换对比模式:', mode);
  };

  const handleRefresh = () => {
    loadImages();
  };

  const handleExport = () => {
    // 导出对比结果
    console.log('导出对比结果');
  };

  const handleSaveComparison = () => {
    // 保存对比配置
    console.log('保存对比配置');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">加载影像数据中...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16 p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">加载错误</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                    onClick={handleRefresh}
                  >
                    重新加载
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-64 pt-16">
        <div className="h-screen pt-16">
          {/* 页面标题栏 */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">影像对比</h1>
                <p className="text-gray-600 mt-1">
                  同时查看和对比多个医学影像，支持多种对比模式和同步操作
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* 操作按钮 */}
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  刷新
                </button>

                <button
                  onClick={handleSaveComparison}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <i className="ri-save-line mr-2"></i>
                  保存配置
                </button>

                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <i className="ri-download-line mr-2"></i>
                  导出结果
                </button>
              </div>
            </div>
          </div>

          {/* 影像对比组件 */}
          <div className="h-full">
            <ImageComparison
              images={images}
              mode={selectedMode}
              maxImages={4}
              syncOptions={{
                zoom: true,
                pan: true,
                windowLevel: true,
                rotation: false,
              }}
              onImageSelect={handleImageSelect}
              onModeChange={handleModeChange}
              className="h-full"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

const ImageComparisonPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImageComparisonContent />
    </Suspense>
  );
};

export default ImageComparisonPage;
