/**
 * 影像对比展示组件
 * 
 * 支持多影像同时展示和对比功能
 * 
 * 功能特性：
 * - 多影像并排显示
 * - 同步缩放和平移
 * - 窗宽窗位同步调整
 * - 影像切换和排列
 * - 对比模式切换
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ImageViewer from './ImageViewer'

// 影像信息接口
interface ImageInfo {
  id: string
  url: string
  thumbnailUrl?: string
  title: string
  description?: string
  metadata?: {
    patientName?: string
    studyDate?: string
    modality?: string
    windowCenter?: number
    windowWidth?: number
    rows?: number
    columns?: number
  }
}

// 对比模式
export enum ComparisonMode {
  SIDE_BY_SIDE = 'side-by-side',      // 并排显示
  OVERLAY = 'overlay',                // 叠加显示
  SPLIT_SCREEN = 'split-screen',      // 分屏显示
  GRID = 'grid'                       // 网格显示
}

// 同步选项
interface SyncOptions {
  zoom: boolean
  pan: boolean
  windowLevel: boolean
  rotation: boolean
}

interface ImageComparisonProps {
  images: ImageInfo[]
  mode?: ComparisonMode
  maxImages?: number
  syncOptions?: SyncOptions
  onImageSelect?: (imageId: string) => void
  onModeChange?: (mode: ComparisonMode) => void
  className?: string
}

const ImageComparison: React.FC<ImageComparisonProps> = ({
  images,
  mode = ComparisonMode.SIDE_BY_SIDE,
  maxImages = 4,
  syncOptions = { zoom: true, pan: true, windowLevel: true, rotation: false },
  onImageSelect,
  onModeChange,
  className = ''
}) => {
  // 状态管理
  const [selectedImages, setSelectedImages] = useState<ImageInfo[]>([])
  const [currentMode, setCurrentMode] = useState<ComparisonMode>(mode)
  const [syncEnabled, setSyncEnabled] = useState<SyncOptions>(syncOptions)
  const [viewerStates, setViewerStates] = useState<Map<string, any>>(new Map())
  const [activeViewer, setActiveViewer] = useState<string | null>(null)
  
  // 引用管理
  const viewerRefs = useRef<Map<string, any>>(new Map())
  
  // 初始化选中的影像
  useEffect(() => {
    if (images.length > 0) {
      const initialImages = images.slice(0, Math.min(maxImages, images.length))
      setSelectedImages(initialImages)
    }
  }, [images, maxImages])
  
  // 处理影像选择
  const handleImageSelect = useCallback((imageInfo: ImageInfo, index: number) => {
    const newSelectedImages = [...selectedImages]
    newSelectedImages[index] = imageInfo
    setSelectedImages(newSelectedImages)
    onImageSelect?.(imageInfo.id)
  }, [selectedImages, onImageSelect])
  
  // 处理模式切换
  const handleModeChange = useCallback((newMode: ComparisonMode) => {
    setCurrentMode(newMode)
    onModeChange?.(newMode)
  }, [onModeChange])
  
  // 同步查看器状态
  const syncViewerState = useCallback((sourceId: string, state: any) => {
    if (!syncEnabled || activeViewer !== sourceId) return
    
    viewerRefs.current.forEach((viewer, viewerId) => {
      if (viewerId !== sourceId && viewer) {
        if (syncEnabled.zoom && state.scale !== undefined) {
          viewer.setScale?.(state.scale)
        }
        if (syncEnabled.pan && (state.offsetX !== undefined || state.offsetY !== undefined)) {
          viewer.setPan?.(state.offsetX, state.offsetY)
        }
        if (syncEnabled.windowLevel && (state.windowCenter !== undefined || state.windowWidth !== undefined)) {
          viewer.setWindowLevel?.(state.windowCenter, state.windowWidth)
        }
        if (syncEnabled.rotation && state.rotation !== undefined) {
          viewer.setRotation?.(state.rotation)
        }
      }
    })
  }, [syncEnabled, activeViewer])
  
  // 获取网格布局类名
  const getGridClassName = useCallback(() => {
    const count = selectedImages.length
    if (count <= 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2'
    return 'grid-cols-3'
  }, [selectedImages.length])
  
  // 获取网格行数类名
  const getGridRowsClassName = useCallback(() => {
    const count = selectedImages.length
    if (count <= 2) return 'grid-rows-1'
    if (count <= 4) return 'grid-rows-2'
    return 'grid-rows-3'
  }, [selectedImages.length])
  
  // 渲染影像选择器
  const renderImageSelector = (index: number) => {
    const selectedImage = selectedImages[index]
    
    return (
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          影像 {index + 1}
        </label>
        <select
          value={selectedImage?.id || ''}
          onChange={(e) => {
            const imageInfo = images.find(img => img.id === e.target.value)
            if (imageInfo) {
              handleImageSelect(imageInfo, index)
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">选择影像...</option>
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              {image.title} - {image.metadata?.modality || 'Unknown'}
            </option>
          ))}
        </select>
      </div>
    )
  }
  
  // 渲染工具栏
  const renderToolbar = () => (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* 对比模式选择 */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">对比模式:</label>
          <div className="flex space-x-2">
            {Object.values(ComparisonMode).map((modeValue) => (
              <button
                key={modeValue}
                onClick={() => handleModeChange(modeValue)}
                className={`px-3 py-1 text-sm rounded ${
                  currentMode === modeValue
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {modeValue === ComparisonMode.SIDE_BY_SIDE && '并排'}
                {modeValue === ComparisonMode.OVERLAY && '叠加'}
                {modeValue === ComparisonMode.SPLIT_SCREEN && '分屏'}
                {modeValue === ComparisonMode.GRID && '网格'}
              </button>
            ))}
          </div>
        </div>
        
        {/* 同步选项 */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">同步:</label>
          <div className="flex space-x-3">
            {Object.entries(syncEnabled).map(([key, enabled]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setSyncEnabled(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="mr-1"
                />
                <span className="text-sm text-gray-600">
                  {key === 'zoom' && '缩放'}
                  {key === 'pan' && '平移'}
                  {key === 'windowLevel' && '窗宽窗位'}
                  {key === 'rotation' && '旋转'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
  
  // 渲染影像查看器
  const renderImageViewer = (imageInfo: ImageInfo, index: number) => {
    if (!imageInfo) return null
    
    return (
      <div
        key={`${imageInfo.id}-${index}`}
        className="relative border border-gray-300 rounded overflow-hidden"
        onMouseEnter={() => setActiveViewer(imageInfo.id)}
      >
        {/* 影像标题 */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white text-sm p-2 z-10">
          <div className="font-medium">{imageInfo.title}</div>
          {imageInfo.metadata && (
            <div className="text-xs opacity-75">
              {imageInfo.metadata.patientName} - {imageInfo.metadata.modality} - {imageInfo.metadata.studyDate}
            </div>
          )}
        </div>
        
        {/* 影像查看器 */}
        <ImageViewer
          imageUrl={imageInfo.url}
          imageId={imageInfo.id}
          isDicom={true}
          metadata={imageInfo.metadata}
          className="h-full"
          ref={(ref) => {
            if (ref) {
              viewerRefs.current.set(imageInfo.id, ref)
            }
          }}
          onStateChange={(state) => {
            setViewerStates(prev => new Map(prev.set(imageInfo.id, state)))
            syncViewerState(imageInfo.id, state)
          }}
        />
      </div>
    )
  }
  
  // 渲染对比视图
  const renderComparisonView = () => {
    if (selectedImages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4">📷</div>
            <div>请选择要对比的影像</div>
          </div>
        </div>
      )
    }
    
    switch (currentMode) {
      case ComparisonMode.SIDE_BY_SIDE:
        return (
          <div className="flex-1 flex space-x-2 p-4">
            {selectedImages.map((image, index) => (
              <div key={index} className="flex-1">
                {renderImageViewer(image, index)}
              </div>
            ))}
          </div>
        )
      
      case ComparisonMode.GRID:
        return (
          <div className="flex-1 p-4">
            <div className={`grid ${getGridClassName()} ${getGridRowsClassName()} gap-2 h-full`}>
              {selectedImages.map((image, index) => (
                <div key={index} className="min-h-0">
                  {renderImageViewer(image, index)}
                </div>
              ))}
            </div>
          </div>
        )
      
      case ComparisonMode.OVERLAY:
        return (
          <div className="flex-1 relative p-4">
            {selectedImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-4 ${index > 0 ? 'opacity-50' : ''}`}
                style={{ zIndex: selectedImages.length - index }}
              >
                {renderImageViewer(image, index)}
              </div>
            ))}
          </div>
        )
      
      case ComparisonMode.SPLIT_SCREEN:
        return (
          <div className="flex-1 flex p-4">
            {selectedImages.slice(0, 2).map((image, index) => (
              <div key={index} className="flex-1" style={{ clipPath: index === 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}>
                {renderImageViewer(image, index)}
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      {renderToolbar()}
      
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 - 影像选择 */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-4">影像选择</h3>
          {Array.from({ length: Math.min(maxImages, 4) }, (_, index) => (
            <div key={index}>
              {renderImageSelector(index)}
            </div>
          ))}
          
          {/* 统计信息 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <div>可用影像: {images.length}</div>
              <div>已选择: {selectedImages.length}</div>
              <div>对比模式: {currentMode}</div>
            </div>
          </div>
        </div>
        
        {/* 主要对比区域 */}
        {renderComparisonView()}
      </div>
    </div>
  )
}

export default ImageComparison
