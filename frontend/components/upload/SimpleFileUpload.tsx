'use client'

/**
 * 简化文件上传组件
 * 
 * 不依赖外部库的文件上传组件，支持拖拽和批量上传
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface SimpleFileUploadProps {
  onFilesSelected?: (files: File[]) => void
  onUploadProgress?: (progress: UploadProgress) => void
  onUploadComplete?: (results: UploadResult[]) => void
  onError?: (error: string) => void
  accept?: string
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
}

interface UploadResult {
  fileName: string
  fileId: string
  url: string
  success: boolean
  error?: string
}

const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({
  onFilesSelected,
  onUploadProgress,
  onUploadComplete,
  onError,
  accept = '.dcm,.dicom,.jpg,.jpeg,.png,.tiff',
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize) {
      return `文件大小超过限制 (${(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB)`
    }

    // 检查文件类型
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      const isAccepted = acceptedTypes.some(type => 
        type === fileExt || 
        type === file.type ||
        (type.startsWith('.') && fileExt === type)
      )
      
      if (!isAccepted) {
        return `不支持的文件类型，支持: ${accept}`
      }
    }

    return null
  }

  // 处理文件选择
  const handleFiles = (files: FileList | File[]) => {
    if (disabled) return

    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const errors: string[] = []

    // 检查文件数量限制
    if (selectedFiles.length + fileArray.length > maxFiles) {
      onError?.(`最多只能选择 ${maxFiles} 个文件`)
      return
    }

    // 验证每个文件
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      onError?.(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles]
      setSelectedFiles(newFiles)
      onFilesSelected?.(validFiles)
    }
  }

  // 拖拽事件处理
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  // 文件输入变化
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // 清空input值，允许重复选择同一文件
    e.target.value = ''
  }

  // 点击选择文件
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // 移除文件
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
  }

  // 清空所有文件
  const clearFiles = () => {
    setSelectedFiles([])
    setUploadProgress(new Map())
  }

  // 开始上传
  const startUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return

    setIsUploading(true)
    const results: UploadResult[] = []

    for (const file of selectedFiles) {
      try {
        // 更新进度
        const progress: UploadProgress = {
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        }
        setUploadProgress(prev => new Map(prev.set(file.name, progress)))
        onUploadProgress?.(progress)

        // 创建FormData
        const formData = new FormData()
        formData.append('file', file)

        // 上传文件
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/upload/single`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })

        if (!response.ok) {
          throw new Error(`上传失败: ${response.statusText}`)
        }

        const result = await response.json()

        // 更新为完成状态
        const completedProgress: UploadProgress = {
          fileName: file.name,
          progress: 100,
          status: 'completed'
        }
        setUploadProgress(prev => new Map(prev.set(file.name, completedProgress)))
        onUploadProgress?.(completedProgress)

        results.push({
          fileName: file.name,
          fileId: result.file_id,
          url: result.upload_url,
          success: true
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '上传失败'
        
        // 更新为错误状态
        const errorProgress: UploadProgress = {
          fileName: file.name,
          progress: 0,
          status: 'error'
        }
        setUploadProgress(prev => new Map(prev.set(file.name, errorProgress)))
        onUploadProgress?.(errorProgress)

        results.push({
          fileName: file.name,
          fileId: '',
          url: '',
          success: false,
          error: errorMessage
        })

        onError?.(`${file.name}: ${errorMessage}`)
      }
    }

    setIsUploading(false)
    onUploadComplete?.(results)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`simple-file-upload ${className}`}>
      {/* 拖拽上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className="text-6xl">
            {isDragging ? '📂' : '📁'}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? '释放文件以选择' : '拖拽文件到此处或点击选择'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              支持格式: {accept} | 最大 {formatFileSize(maxSize)} | 最多 {maxFiles} 个文件
            </p>
          </div>
        </div>
      </div>

      {/* 选中的文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              已选择文件 ({selectedFiles.length}/{maxFiles})
            </h3>
            <div className="space-x-2">
              <button
                onClick={startUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '上传中...' : '开始上传'}
              </button>
              <button
                onClick={clearFiles}
                disabled={isUploading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清空
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedFiles.map((file, index) => {
              const progress = uploadProgress.get(file.name)

              return (
                <div key={`${file.name}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      {progress && (
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                progress.status === 'completed' ? 'bg-green-500' :
                                progress.status === 'error' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-[3rem]">
                            {progress.status === 'completed' ? '✅' :
                             progress.status === 'error' ? '❌' :
                             `${progress.progress}%`}
                          </span>
                        </div>
                      )}

                      {!progress && (
                        <button
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleFileUpload
