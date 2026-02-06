'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Tooltip from '@/components/ui/Tooltip';
import {
  createAuthenticatedClient,
  useAuthStore,
  useUser,
} from '@/store/authStore';
import {
  getImageFiles,
  deleteImageFile,
  downloadImageFile,
  getImagePreviewUrl,
  formatFileSize,
  formatDate,
  type ImageFile,
  type ImageFileFilters
} from '@/services/imageFileService';
import { checkAndHandleAuthError, getErrorMessage } from '@/utils/authErrorHandler';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  blobUrl?: string;
}

export default function ImagingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useUser();

  // 从 URL 参数读取初始筛选条件
  const urlStatus = searchParams.get('status');
  const urlReviewStatus = searchParams.get('review_status');

  // 数据状态
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // 如果有 URL 参数，自动展开筛选器
  const [showFilters, setShowFilters] = useState(!!urlStatus || !!urlReviewStatus);
  const [selectedExamType, setSelectedExamType] = useState<string>('all'); // 检查类型
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>(
    urlReviewStatus || (urlStatus === 'pending' ? 'unreviewed' : 'all')
  ); // 审核状态

  // 判断是否有激活的筛选条件
  const hasActiveFilters = searchTerm.trim() !== '' || selectedExamType !== 'all' || selectedReviewStatus !== 'all';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // 搜索防抖：延迟500ms后更新debouncedSearchTerm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 加载影像数据
  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ImageFileFilters = {
        page: currentPage,
        page_size: pageSize,
      };

      if (debouncedSearchTerm) filters.search = debouncedSearchTerm;
      if (selectedExamType !== 'all') filters.description = selectedExamType;

      // 处理审核状态筛选
      if (selectedReviewStatus !== 'all') {
        filters.review_status = selectedReviewStatus as 'reviewed' | 'unreviewed';
      }

      if (dateFrom) filters.start_date = dateFrom;
      if (dateTo) filters.end_date = dateTo;

      const response = await getImageFiles(filters);

      // 验证响应数据格式
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      if (!Array.isArray(response.items)) {
        console.error('Invalid response.items:', response);
        throw new Error('Response items is not an array');
      }

      setImageFiles(response.items);
      setTotal(response.total || 0);

      // 异步加载图片预览URL
      const urls: Record<number, string> = {};
      for (const file of response.items) {
        try {
          urls[file.id] = await getImagePreviewUrl(file.id);
        } catch (error) {
          console.error(`Failed to load preview for file ${file.id}:`, error);
        }
      }
      setImageUrls(urls);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load images:', err);
      console.log('错误类型检查:', {
        hasResponse: !!err.response,
        status: err.response?.status,
        message: err.message,
        isAuthError: err.response?.status === 401 || err.message?.toLowerCase().includes('authentication'),
      });

      // 检查并处理认证错误
      if (checkAndHandleAuthError(err, { showAlert: false, redirectDelay: 0 })) {
        // 认证错误，显示跳转提示
        console.log('✅ 检测到认证错误，准备跳转到登录页');
        setError('登录已过期，正在跳转到登录页...');
        setImageFiles([]);
        // 保持 loading 状态，避免显示错误页面
        return;
      }

      // 设置错误消息（仅非认证错误）
      console.log('⚠️ 非认证错误，显示错误消息');
      setError(getErrorMessage(err, '加载影像失败，请重试'));
      setImageFiles([]);
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
      loadImages();
    }

    // 清理Object URLs
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [isAuthenticated, currentPage, debouncedSearchTerm, selectedExamType, selectedReviewStatus, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedExamType('all');
    setSelectedReviewStatus('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleMoreAction = async (fileId: number, action: string) => {
    setOpenDropdown(null);

    switch (action) {
      case 'download':
        try {
          const blob = await downloadImageFile(fileId);
          const url = URL.createObjectURL(blob);
          const imageFile = imageFiles.find(f => f.id === fileId);
          const a = document.createElement('a');
          a.href = url;
          a.download = imageFile?.original_filename || `image_${fileId}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error('下载失败:', error);
          // 检查并处理认证错误
          if (checkAndHandleAuthError(error)) {
            return;
          }
          alert(getErrorMessage(error, '下载失败，请重试'));
        }
        break;
      case 'delete':
        if (confirm('确定要删除这个影像吗？此操作不可撤销。')) {
          try {
            await deleteImageFile(fileId);
            // 刷新列表
            loadImages();
            alert('影像删除成功');
          } catch (error: any) {
            console.error('删除影像失败:', error);
            // 检查并处理认证错误
            if (checkAndHandleAuthError(error)) {
              return;
            }
            alert(getErrorMessage(error, '删除失败，请重试'));
          }
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
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">{error || '加载影像数据中...'}</p>
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
              onClick={loadImages}
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
              <Tooltip content="上传新的医学影像文件" position="bottom">
                <Link
                  href="/upload?returnTo=/imaging"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap inline-flex items-center"
                >
                  <i className="ri-upload-line mr-1"></i>
                  上传影像
                </Link>
              </Tooltip>
              <Tooltip content="对比查看多个影像" position="bottom">
                <Link
                  href="/imaging/comparison"
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap inline-flex items-center"
                >
                  <i className="ri-file-copy-line mr-1"></i>
                  影像对比
                </Link>
              </Tooltip>
              <Tooltip content="批量下载选中的影像文件" position="bottom">
                <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap inline-flex items-center">
                  <i className="ri-download-line mr-1"></i>
                  批量下载
                </button>
              </Tooltip>
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
                  placeholder="搜索患者姓名、检查类型或文件名"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 筛选按钮 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg ${showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                筛选
                {(selectedExamType !== 'all' || selectedReviewStatus !== 'all' || dateFrom || dateTo) && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5">
                    !
                  </span>
                )}
              </button>
            </div>

            {/* 视图切换和统计 */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                显示 {imageFiles.length} 条记录
                {total > 0 && ` (共 ${total} 条)`}
              </span>

              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 ${viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <i className="ri-grid-line w-4 h-4 flex items-center justify-center"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 ${viewMode === 'list'
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
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  检查类型
                </label>
                <select
                  value={selectedExamType}
                  onChange={e => setSelectedExamType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部类型</option>
                  <option value="正位X光片">正位X光片</option>
                  <option value="侧位X光片">侧位X光片</option>
                  <option value="左侧曲位">左侧曲位</option>
                  <option value="右侧曲位">右侧曲位</option>
                  <option value="体态照片">体态照片</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  审核状态
                </label>
                <select
                  value={selectedReviewStatus}
                  onChange={e => setSelectedReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部状态</option>
                  <option value="reviewed">已审核</option>
                  <option value="unreviewed">未审核</option>
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

              <div className="md:col-span-4 flex justify-end">
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
          {imageFiles.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {imageFiles.map(imageFile => (
                  <div
                    key={imageFile.id}
                    className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* 影像预览 */}
                    <Link href={`/imaging/viewer?id=${imageFile.id}`}>
                      <div className="aspect-[3/4] bg-black rounded-t-lg overflow-hidden relative cursor-pointer flex items-center justify-center">
                        {imageUrls[imageFile.id] ? (
                          <img
                            src={imageUrls[imageFile.id]}
                            alt={imageFile.original_filename}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.placeholder-icon')) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'placeholder-icon w-full h-full flex items-center justify-center text-gray-400';
                                placeholder.innerHTML = '<i class="ri-image-line text-4xl"></i>';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <i className="ri-loader-4-line text-4xl animate-spin"></i>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${imageFile.status === 'UPLOADED'
                              ? 'bg-green-500/80 text-white'
                              : imageFile.status === 'PROCESSING'
                              ? 'bg-blue-500/80 text-white'
                              : imageFile.status === 'PROCESSED'
                              ? 'bg-purple-500/80 text-white'
                              : 'bg-gray-500/80 text-white'
                              }`}
                          >
                            {imageFile.status === 'UPLOADED' ? '已上传' :
                             imageFile.status === 'PROCESSING' ? '处理中' :
                             imageFile.status === 'PROCESSED' ? '已处理' : imageFile.status}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* 影像信息 */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate" title={imageFile.original_filename}>
                          {imageFile.original_filename}
                        </h3>
                        <p className="text-blue-600 font-medium text-sm">
                          {imageFile.modality || imageFile.file_type}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex justify-between">
                          <span>上传日期:</span>
                          <span className="font-medium">{formatDate(imageFile.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>文件大小:</span>
                          <span className="font-medium">{formatFileSize(imageFile.file_size)}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex space-x-2">
                        <Link
                          href={`/imaging/viewer?id=${imageFile.id}`}
                          className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                        >
                          标注分析
                        </Link>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === imageFile.id.toString() ? null : imageFile.id.toString()
                              )
                            }
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                          >
                            更多
                          </button>

                          {/* 下拉菜单 */}
                          {openDropdown === imageFile.id.toString() && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                              <div className="py-1">
                                <button
                                  onClick={() =>
                                    handleMoreAction(imageFile.id, 'download')
                                  }
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                >
                                  <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                                  <span>下载</span>
                                </button>
                                <div className="border-t border-gray-100"></div>
                                <button
                                  onClick={() =>
                                    handleMoreAction(imageFile.id, 'delete')
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
                {imageFiles.map(imageFile => (
                  <div key={imageFile.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {/* 缩略图 */}
                      <Link href={`/imaging/viewer?id=${imageFile.id}`}>
                        <div className="w-16 h-20 bg-black rounded overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center">
                          {imageUrls[imageFile.id] ? (
                            <img
                              src={imageUrls[imageFile.id]}
                              alt={imageFile.original_filename}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.placeholder-icon')) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'placeholder-icon w-full h-full flex items-center justify-center text-gray-400';
                                  placeholder.innerHTML = '<i class="ri-image-line text-2xl"></i>';
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <i className="ri-loader-4-line text-2xl animate-spin"></i>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* 基本信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-semibold text-gray-900 truncate" title={imageFile.original_filename}>
                              {imageFile.original_filename}
                            </span>
                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {imageFile.modality || imageFile.file_type}
                            </span>
                          </div>
                          <span
                            className={`text-sm px-3 py-1 rounded-full ${imageFile.status === 'UPLOADED'
                              ? 'bg-green-100 text-green-800'
                              : imageFile.status === 'PROCESSING'
                              ? 'bg-blue-100 text-blue-800'
                              : imageFile.status === 'PROCESSED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {imageFile.status === 'UPLOADED' ? '已上传' :
                             imageFile.status === 'PROCESSING' ? '处理中' :
                             imageFile.status === 'PROCESSED' ? '已处理' : imageFile.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="text-gray-500">上传日期: </span>
                            <span className="font-medium">
                              {formatDate(imageFile.created_at)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">文件大小: </span>
                            <span className="font-medium">
                              {formatFileSize(imageFile.file_size)}
                            </span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/imaging/viewer?id=${imageFile.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2 whitespace-nowrap"
                          >
                            <i className="ri-eye-line w-4 h-4 flex items-center justify-center"></i>
                            <span>标注分析</span>
                          </Link>
                          <button
                            onClick={() =>
                              handleMoreAction(imageFile.id, 'download')
                            }
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center space-x-2 whitespace-nowrap"
                          >
                            <i className="ri-download-line w-4 h-4 flex items-center justify-center"></i>
                            <span>下载</span>
                          </button>
                          <button
                            onClick={() =>
                              handleMoreAction(imageFile.id, 'delete')
                            }
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 text-sm flex items-center space-x-2 whitespace-nowrap"
                          >
                            <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                            <span>删除</span>
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
              {hasActiveFilters ? (
                // 有筛选条件但没有结果
                <>
                  <i className="ri-search-line w-16 h-16 flex items-center justify-center mx-auto mb-4 text-4xl"></i>
                  <h3 className="text-lg font-medium text-gray-500 mb-2">
                    未找到匹配的影像
                  </h3>
                  <p className="text-gray-400 mb-4">请尝试调整搜索条件或筛选器</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedExamType('all');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <i className="ri-refresh-line"></i>
                    <span>清除筛选条件</span>
                  </button>
                </>
              ) : (
                // 完全没有图片
                <>
                  <i className="ri-image-add-line w-16 h-16 flex items-center justify-center mx-auto mb-4 text-4xl"></i>
                  <h3 className="text-lg font-medium text-gray-500 mb-2">
                    还没有上传任何影像
                  </h3>
                  <p className="text-gray-400">开始上传您的第一张医疗影像吧</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> 条，
              共 <span className="font-medium">{total}</span> 条
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * pageSize >= total}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
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
