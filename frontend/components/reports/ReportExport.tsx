'use client'

/**
 * 报告导出组件
 * 
 * 提供报告导出为PDF、Word、图片等格式的功能
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { authenticatedJsonFetch } from '@/lib/api'

interface ExportOptions {
  format: 'pdf' | 'word' | 'image' | 'html'
  template?: string
  includeImages: boolean
  watermark?: string
}

interface ExportTask {
  taskId: string
  status: 'processing' | 'completed' | 'failed'
  message: string
  downloadUrl?: string
  fileSize?: number
  createdAt: string
}

interface ReportExportProps {
  reportIds: number[]
  reportTitles?: string[]
  onExportStart?: () => void
  onExportComplete?: (taskId: string, downloadUrl: string) => void
  onExportError?: (error: string) => void
  className?: string
}

export default function ReportExport({
  reportIds,
  reportTitles = [],
  onExportStart,
  onExportComplete,
  onExportError,
  className = ''
}: ReportExportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeImages: true,
    watermark: ''
  })
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([])
  const [showOptions, setShowOptions] = useState(false)

  // 轮询检查导出状态
  useEffect(() => {
    const processingTasks = exportTasks.filter(task => task.status === 'processing')
    
    if (processingTasks.length > 0) {
      const interval = setInterval(async () => {
        for (const task of processingTasks) {
          try {
            const updatedTask = await authenticatedJsonFetch<ExportTask>(
              `/api/v1/report-export/status/${task.taskId}`
            )

            setExportTasks(prev => prev.map(t => 
              t.taskId === task.taskId ? updatedTask : t
            ))

            if (updatedTask.status === 'completed' && updatedTask.downloadUrl) {
              onExportComplete?.(updatedTask.taskId, updatedTask.downloadUrl)
            } else if (updatedTask.status === 'failed') {
              onExportError?.(updatedTask.message)
            }
          } catch (error) {
            console.error('检查导出状态失败:', error)
          }
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [exportTasks, onExportComplete, onExportError])

  // 单个报告导出
  const handleSingleExport = async (reportId: number) => {
    if (isExporting) return

    setIsExporting(true)
    onExportStart?.()

    try {
      const params = new URLSearchParams({
        format: exportOptions.format,
        include_images: exportOptions.includeImages.toString(),
        ...(exportOptions.template && { template: exportOptions.template }),
        ...(exportOptions.watermark && { watermark: exportOptions.watermark })
      })

      const result = await authenticatedJsonFetch<any>(
        `/api/v1/report-export/single/${reportId}?${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      const newTask: ExportTask = {
        taskId: result.task_id,
        status: result.status,
        message: result.message,
        downloadUrl: result.download_url,
        fileSize: result.file_size,
        createdAt: result.created_at
      }

      setExportTasks(prev => [newTask, ...prev])

      if (result.status === 'completed' && result.download_url) {
        onExportComplete?.(result.task_id, result.download_url)
      }

    } catch (error) {
      console.error('导出失败:', error)
      onExportError?.('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // 批量导出
  const handleBatchExport = async () => {
    if (isExporting || reportIds.length === 0) return

    setIsExporting(true)
    onExportStart?.()

    try {
      const result = await authenticatedJsonFetch<any>(
        '/api/v1/report-export/batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_ids: reportIds,
            format: exportOptions.format,
            template: exportOptions.template,
            include_images: exportOptions.includeImages,
            watermark: exportOptions.watermark
          })
        }
      )
      
      const newTask: ExportTask = {
        taskId: result.task_id,
        status: result.status,
        message: result.message,
        downloadUrl: result.download_url,
        fileSize: result.file_size,
        createdAt: result.created_at
      }

      setExportTasks(prev => [newTask, ...prev])

    } catch (error) {
      console.error('批量导出失败:', error)
      onExportError?.('批量导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // 下载文件
  const handleDownload = (downloadUrl: string, taskId: string) => {
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `report_${taskId}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 导出选项 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">报告导出</h3>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showOptions ? '隐藏选项' : '显示选项'}
          </button>
        </div>

        {showOptions && (
          <div className="space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
            {/* 导出格式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'pdf', label: 'PDF', icon: '📄' },
                  { value: 'word', label: 'Word', icon: '📝' },
                  { value: 'image', label: '图片', icon: '🖼️' },
                  { value: 'html', label: 'HTML', icon: '🌐' }
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportOptions(prev => ({ ...prev, format: format.value as any }))}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      exportOptions.format === format.value
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {format.icon} {format.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 包含图片 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeImages"
                checked={exportOptions.includeImages}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeImages: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeImages" className="ml-2 text-sm text-gray-700">
                包含图片
              </label>
            </div>

            {/* 水印 */}
            <div>
              <label htmlFor="watermark" className="block text-sm font-medium text-gray-700 mb-1">
                水印文本（可选）
              </label>
              <input
                type="text"
                id="watermark"
                value={exportOptions.watermark}
                onChange={(e) => setExportOptions(prev => ({ ...prev, watermark: e.target.value }))}
                placeholder="请输入水印文本"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 模板选择 */}
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                导出模板（可选）
              </label>
              <select
                id="template"
                value={exportOptions.template || ''}
                onChange={(e) => setExportOptions(prev => ({ ...prev, template: e.target.value || undefined }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">默认模板</option>
                <option value="standard">标准模板</option>
                <option value="detailed">详细模板</option>
                <option value="summary">摘要模板</option>
              </select>
            </div>
          </div>
        )}

        {/* 导出按钮 */}
        <div className="flex gap-2">
          {reportIds.length === 1 ? (
            <Button
              onClick={() => handleSingleExport(reportIds[0])}
              disabled={isExporting}
              variant="primary"
            >
              {isExporting ? '导出中...' : `📤 导出报告`}
            </Button>
          ) : (
            <Button
              onClick={handleBatchExport}
              disabled={isExporting || reportIds.length === 0}
              variant="primary"
            >
              {isExporting ? '导出中...' : `📤 批量导出 (${reportIds.length}个)`}
            </Button>
          )}
        </div>
      </div>

      {/* 导出任务列表 */}
      {exportTasks.length > 0 && (
        <div className="p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">导出记录</h4>
          <div className="space-y-3">
            {exportTasks.map((task) => (
              <div
                key={task.taskId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {task.taskId.includes('batch') ? '批量导出' : '单个导出'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {task.status === 'completed' ? '已完成' : 
                       task.status === 'processing' ? '处理中' : '失败'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {task.message}
                    {task.fileSize && ` (${formatFileSize(task.fileSize)})`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTime(task.createdAt)}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {task.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  
                  {task.status === 'completed' && task.downloadUrl && (
                    <Button
                      onClick={() => handleDownload(task.downloadUrl!, task.taskId)}
                      variant="outline"
                      size="sm"
                    >
                      📥 下载
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {reportIds.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">📄</div>
          <p>请先选择要导出的报告</p>
        </div>
      )}
    </div>
  )
}
