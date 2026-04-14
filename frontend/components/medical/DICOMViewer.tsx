'use client'

/**
 * DICOM专用查看器组件
 * 
 * 集成cornerstone.js或自定义DICOM处理，支持多帧、序列浏览
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useEffect, useRef } from 'react'
import ImageViewer from './ImageViewer'
import { getDicomImageInfo, getDicomStudy } from '@/services/dicomServices'

interface DICOMViewerProps {
  studyId?: string
  seriesId?: string
  instanceId?: string
  imageUrl?: string
  onSeriesChange?: (seriesId: string) => void
  onInstanceChange?: (instanceId: string) => void
  className?: string
}

interface DICOMStudy {
  studyId: string
  studyDate: string
  studyDescription: string
  patientName: string
  patientId: string
  series: DICOMSeries[]
}

interface DICOMSeries {
  seriesId: string
  seriesNumber: number
  seriesDescription: string
  modality: string
  instanceCount: number
  instances: DICOMInstance[]
}

interface DICOMInstance {
  instanceId: string
  instanceNumber: number
  imageUrl: string
  thumbnailUrl: string
  metadata: DICOMMetadata
}

interface DICOMMetadata {
  patientName: string
  patientId: string
  studyDate: string
  studyDescription: string
  seriesDescription: string
  modality: string
  rows: number
  columns: number
  pixelSpacing?: number[]
  sliceThickness?: number
  sliceLocation?: number
  windowCenter?: number
  windowWidth?: number
  manufacturer?: string
  stationName?: string
}

const DICOMViewer: React.FC<DICOMViewerProps> = ({
  studyId,
  seriesId,
  instanceId,
  imageUrl,
  onSeriesChange,
  onInstanceChange,
  className = ''
}) => {
  const [study, setStudy] = useState<DICOMStudy | null>(null)
  const [currentSeries, setCurrentSeries] = useState<DICOMSeries | null>(null)
  const [currentInstance, setCurrentInstance] = useState<DICOMInstance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSeriesList, setShowSeriesList] = useState(false)
  const [showInstanceList, setShowInstanceList] = useState(false)

  // 加载研究数据
  useEffect(() => {
    if (studyId) {
      loadStudy(studyId)
    } else if (imageUrl) {
      // 单独图像模式
      loadSingleImage(imageUrl)
    }
  }, [studyId, imageUrl])

  // 加载研究
  const loadStudy = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const studyData = await getDicomStudy(id)
      setStudy(studyData)

      // 设置默认序列和实例
      if (studyData.series.length > 0) {
        const defaultSeries = studyData.series[0]
        setCurrentSeries(defaultSeries)
        
        if (defaultSeries.instances.length > 0) {
          setCurrentInstance(defaultSeries.instances[0])
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载研究失败'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // 加载单独图像
  const loadSingleImage = async (url: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // 获取图像元数据
      const imageId = url.split('/').pop() || 'unknown'
      const imageInfo = await getDicomImageInfo(imageId)
        
        // 创建虚拟研究结构
        const virtualInstance: DICOMInstance = {
          instanceId: imageId,
          instanceNumber: 1,
          imageUrl: url,
          thumbnailUrl: imageInfo.thumbnail_url || '',
          metadata: {
            patientName: '未知患者',
            patientId: 'UNKNOWN',
            studyDate: new Date().toISOString().split('T')[0],
            studyDescription: '单独图像',
            seriesDescription: '单独图像',
            modality: imageInfo.is_dicom ? 'CR' : 'OT',
            rows: imageInfo.height || 0,
            columns: imageInfo.width || 0,
            windowCenter: 128,
            windowWidth: 256
          }
        }

        const virtualSeries: DICOMSeries = {
          seriesId: 'single-series',
          seriesNumber: 1,
          seriesDescription: '单独图像',
          modality: imageInfo.is_dicom ? 'CR' : 'OT',
          instanceCount: 1,
          instances: [virtualInstance]
        }

        const virtualStudy: DICOMStudy = {
          studyId: 'single-study',
          studyDate: new Date().toISOString().split('T')[0],
          studyDescription: '单独图像查看',
          patientName: '未知患者',
          patientId: 'UNKNOWN',
          series: [virtualSeries]
        }

        setStudy(virtualStudy)
        setCurrentSeries(virtualSeries)
        setCurrentInstance(virtualInstance)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载图像失败'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // 切换序列
  const handleSeriesChange = (series: DICOMSeries) => {
    setCurrentSeries(series)
    if (series.instances.length > 0) {
      setCurrentInstance(series.instances[0])
    }
    onSeriesChange?.(series.seriesId)
    setShowSeriesList(false)
  }

  // 切换实例
  const handleInstanceChange = (instance: DICOMInstance) => {
    setCurrentInstance(instance)
    onInstanceChange?.(instance.instanceId)
    setShowInstanceList(false)
  }

  // 上一个/下一个实例
  const navigateInstance = (direction: 'prev' | 'next') => {
    if (!currentSeries || !currentInstance) return

    const currentIndex = currentSeries.instances.findIndex(
      inst => inst.instanceId === currentInstance.instanceId
    )

    let newIndex: number
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentSeries.instances.length - 1
    } else {
      newIndex = currentIndex < currentSeries.instances.length - 1 ? currentIndex + 1 : 0
    }

    handleInstanceChange(currentSeries.instances[newIndex])
  }

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          navigateInstance('prev')
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          navigateInstance('next')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSeries, currentInstance])

  if (isLoading) {
    return (
      <div className={`dicom-viewer-loading ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p>加载DICOM数据中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`dicom-viewer-error ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl text-red-500 mb-4">⚠️</div>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!study || !currentSeries || !currentInstance) {
    return (
      <div className={`dicom-viewer-empty ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl text-gray-400 mb-4">📁</div>
            <p className="text-gray-600">未找到DICOM数据</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`dicom-viewer ${className} flex flex-col h-full`}>
      {/* DICOM信息栏 */}
      <div className="dicom-info-bar bg-gray-100 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div>
              <span className="font-medium">患者:</span> {study.patientName} ({study.patientId})
            </div>
            <div>
              <span className="font-medium">检查:</span> {study.studyDescription}
            </div>
            <div>
              <span className="font-medium">日期:</span> {study.studyDate}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 序列选择 */}
            <div className="relative">
              <button
                onClick={() => setShowSeriesList(!showSeriesList)}
                className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50"
              >
                序列 {currentSeries.seriesNumber}: {currentSeries.seriesDescription}
                <span className="ml-1">▼</span>
              </button>

              {showSeriesList && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-64">
                  {study.series.map((series) => (
                    <button
                      key={series.seriesId}
                      onClick={() => handleSeriesChange(series)}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        series.seriesId === currentSeries.seriesId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium">
                        序列 {series.seriesNumber}: {series.seriesDescription}
                      </div>
                      <div className="text-gray-500">
                        {series.modality} • {series.instanceCount} 图像
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 实例导航 */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigateInstance('prev')}
                className="px-2 py-1 bg-white border rounded text-sm hover:bg-gray-50"
                disabled={currentSeries.instances.length <= 1}
              >
                ◀
              </button>
              
              <span className="px-2 text-sm">
                {currentInstance.instanceNumber} / {currentSeries.instances.length}
              </span>
              
              <button
                onClick={() => navigateInstance('next')}
                className="px-2 py-1 bg-white border rounded text-sm hover:bg-gray-50"
                disabled={currentSeries.instances.length <= 1}
              >
                ▶
              </button>
            </div>

            {/* 实例列表 */}
            <div className="relative">
              <button
                onClick={() => setShowInstanceList(!showInstanceList)}
                className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50"
              >
                图像列表
              </button>

              {showInstanceList && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {currentSeries.instances.map((instance) => (
                      <button
                        key={instance.instanceId}
                        onClick={() => handleInstanceChange(instance)}
                        className={`relative border rounded overflow-hidden hover:border-blue-500 ${
                          instance.instanceId === currentInstance.instanceId ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={instance.thumbnailUrl}
                          alt={`Instance ${instance.instanceNumber}`}
                          className="w-16 h-16 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                          {instance.instanceNumber}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 图像查看器 */}
      <div className="flex-1">
        <ImageViewer
          imageUrl={currentInstance.imageUrl}
          imageId={currentInstance.instanceId}
          isDicom={true}
          metadata={currentInstance.metadata}
          className="h-full"
        />
      </div>

      {/* 底部状态栏 */}
      <div className="dicom-status-bar bg-gray-800 text-white p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>模态: {currentSeries.modality}</span>
            <span>尺寸: {currentInstance.metadata.columns} × {currentInstance.metadata.rows}</span>
            {currentInstance.metadata.pixelSpacing && (
              <span>像素间距: {currentInstance.metadata.pixelSpacing.join(' × ')} mm</span>
            )}
            {currentInstance.metadata.sliceThickness && (
              <span>层厚: {currentInstance.metadata.sliceThickness} mm</span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {currentInstance.metadata.manufacturer && (
              <span>设备: {currentInstance.metadata.manufacturer}</span>
            )}
            {currentInstance.metadata.stationName && (
              <span>工作站: {currentInstance.metadata.stationName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DICOMViewer
