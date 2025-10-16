'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createAuthenticatedClient, useUser } from '@/store/authStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Study {
  id: number;
  study_instance_uid: string;
  study_id?: string;
  patient_id: number;
  patient_name?: string;
  study_description?: string;
  modality?: string;
  study_date?: string;
  study_time?: string;
  referring_physician?: string;
  status: string;
  series_count: number;
  instance_count: number;
  created_at: string;
  updated_at: string;
}

interface StudyListResponse {
  studies: Study[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ImageItem {
  id: string;
  examType: string;
  studyDate: string;
  status: 'pending' | 'reviewed';
  thumbnailUrl: string;
  patient_name?: string;
  patient_id?: string;
}

export default function ImagingPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();

  // 数据状态
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExamType, setSelectedExamType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // 加载影像数据
  const loadStudies = async () => {
    try {
      setLoading(true);
      setError(null);

      const client = createAuthenticatedClient();
      const response = await client.get('/api/v1/studies', {
        params: {
          page: 1,
          page_size: 50,
        },
      });

      const studiesData = response.data.studies || [];
      setStudies(studiesData);
    } catch (err: any) {
      console.error('Failed to load studies:', err);
      // 不再显示错误信息，认证失败会自动跳转到登录页
      setStudies([]);
    } finally {
      setLoading(false);
    }
  };

  // 认证检查
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStudies();
    }
  }, [isAuthenticated]);

  // 将Study数据转换为ImageItem格式
  const convertStudyToImageItem = (study: Study): ImageItem => {
    return {
      id: `IMG${study.id.toString().padStart(3, '0')}`,
      examType: study.study_description || study.modality || '未知类型',
      studyDate: study.study_date || study.created_at.split('T')[0],
      status: study.status === 'completed' ? 'reviewed' : 'pending',
      thumbnailUrl: `/api/v1/upload/files/${study.id}`,
      patient_name: study.patient_name,
      patient_id: study.patient_id?.toString(),
    };
  };

  // 转换后的影像列表
  const imageItems = studies.map(convertStudyToImageItem);

  // 筛选后的影像列表
  const filteredImages = imageItems.filter(image => {
    const matchesSearch =
      image.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.examType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesExamType =
      selectedExamType === 'all' || image.examType === selectedExamType;

    let matchesDate = true;
    if (dateFrom) {
      matchesDate =
        matchesDate && new Date(image.studyDate) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate =
        matchesDate && new Date(image.studyDate) <= new Date(dateTo);
    }

    return matchesSearch && matchesExamType && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExamType('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleMoreAction = (imageId: string, action: string) => {
    setOpenDropdown(null);

    switch (action) {
      case 'download':
        console.log('下载影像:', imageId);
        // 在实际应用中这里会触发下载
        break;
      case 'delete':
        console.log('删除影像:', imageId);
        // 在实际应用中这里会显示确认删除对话框
        if (confirm('确定要删除这个影像吗？此操作不可撤销。')) {
          // 执行删除操作
        }
        break;
      default:
        console.warn(`未知的操作 "${action}"`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />
        <main className="ml-56 p-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80"></div>
                ))}
              </div>
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
        <main className="ml-56 p-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-red-600 mb-4">
              <i className="ri-error-warning-line text-4xl mb-2"></i>
              <p className="text-lg font-semibold">{error}</p>
            </div>
            <button
              onClick={loadStudies}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />

      <main className="ml-56 p-6">
        {/* 顶部操作栏 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">影像中心</h1>
              <p className="text-gray-600 mt-1">管理和查看患者医学影像</p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/upload?returnTo=/imaging"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-upload-line w-4 h-4 flex items-center justify-center"></i>
                <span>上传影像</span>
              </Link>
              <Link
                href="/imaging/comparison"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 whitespace-nowrap"
              >
                <i className="ri-layout-column-line w-4 h-4 flex items-center justify-center"></i>
                <span>影像对比</span>
              </Link>
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 whitespace-nowrap">
                <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                <span>批量下载</span>
              </button>
            </div>
          </div>

          {/* 搜索和筛选区域 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <i className="ri-search-line w-4 h-4 flex items-center justify-center absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="搜索影像ID或影像类型"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 筛选按钮 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg flex items-center space-x-2 ${
                  showFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="ri-filter-line w-4 h-4 flex items-center justify-center"></i>
                <span>筛选</span>
                {(selectedExamType !== 'all' || dateFrom || dateTo) && (
                  <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
            </div>

            {/* 视图切换和统计 */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                显示 {filteredImages.length} 条记录
                {filteredImages.length !== imageItems.length &&
                  ` (共 ${imageItems.length} 条)`}
              </span>

              <div className="flex border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <i className="ri-grid-line w-4 h-4 flex items-center justify-center"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <i className="ri-list-check w-4 h-4 flex items-center justify-center"></i>
                </button>
              </div>
            </div>
          </div>

          {/* 高级筛选 */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  影像类型
                </label>
                <select
                  value={selectedExamType}
                  onChange={e => setSelectedExamType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                >
                  <option value="all">全部类型</option>
                  <option value="正位X光片">正位X光片</option>
                  <option value="侧位X光片">侧位X光片</option>
                  <option value="体态照片">体态照片</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  清空筛选
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 影像列表内容 */}
        <div className="bg-white rounded-lg border border-gray-200">
          {filteredImages.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {filteredImages.map(image => (
                  <div
                    key={image.id}
                    className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* 影像预览 */}
                    <Link href={`/imaging/${image.id}/viewer`}>
                      <div className="aspect-[3/4] bg-black rounded-t-lg overflow-hidden relative cursor-pointer">
                        <img
                          src={image.thumbnailUrl}
                          alt={`${image.id} - ${image.examType}`}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute top-2 right-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              image.status === 'pending'
                                ? 'bg-orange-500/80 text-white'
                                : 'bg-green-500/80 text-white'
                            }`}
                          >
                            {image.status === 'pending' ? '待审核' : '已审核'}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* 影像信息 */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {image.id}
                        </h3>
                        <p className="text-blue-600 font-medium">
                          {image.examType}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex justify-between">
                          <span>检查日期:</span>
                          <span className="font-medium">{image.studyDate}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex space-x-2">
                        <Link
                          href={`/imaging/${image.id}/viewer`}
                          className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                        >
                          标注分析
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === image.id ? null : image.id
                              )
                            }
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <i className="ri-more-line w-4 h-4 flex items-center justify-center"></i>
                          </button>

                          {/* 下拉菜单 */}
                          {openDropdown === image.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  onClick={() =>
                                    handleMoreAction(image.id, 'download')
                                  }
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                >
                                  <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                                  <span>下载</span>
                                </button>
                                <div className="border-t border-gray-100"></div>
                                <button
                                  onClick={() =>
                                    handleMoreAction(image.id, 'delete')
                                  }
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                >
                                  <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                                  <span>删除</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredImages.map(image => (
                  <div key={image.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {/* 缩略图 */}
                      <Link href={`/imaging/${image.id}/viewer`}>
                        <div className="w-16 h-20 bg-black rounded overflow-hidden flex-shrink-0 cursor-pointer">
                          <img
                            src={image.thumbnailUrl}
                            alt={`${image.id} - ${image.examType}`}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                      </Link>

                      {/* 基本信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-semibold text-gray-900">
                              {image.id}
                            </span>
                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {image.examType}
                            </span>
                          </div>
                          <span
                            className={`text-sm px-3 py-1 rounded-full ${
                              image.status === 'pending'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {image.status === 'pending' ? '待审核' : '已审核'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="text-gray-500">检查日期: </span>
                            <span className="font-medium">
                              {image.studyDate}
                            </span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/imaging/${image.id}/viewer`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-71 text-sm flex items-center space-x-2 whitespace-nowrap"
                          >
                            <i className="ri-eye-line w-4 h-4 flex items-center justify-center"></i>
                            <span>标注分析</span>
                          </Link>
                          <button
                            onClick={() =>
                              handleMoreAction(image.id, 'download')
                            }
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center space-x-2 whitespace-nowrap"
                          >
                            <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                            <span>下载</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-12 text-center text-gray-400">
              <i className="ri-image-line w-16 h-16 flex items-center justify-center mx-auto mb-4 text-4xl"></i>
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                未找到匹配的影像
              </h3>
              <p>请尝试调整搜索条件或筛选器</p>
            </div>
          )}
        </div>
      </main>

      {/* 点击其他地方关闭下拉菜单 */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenDropdown(null)}
        ></div>
      )}
    </div>
  );
}
