'use client'

/**
 * 文件上传组件
 * 
 * 支持拖拽上传、批量上传、进度显示、断点续传
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadProgress?: (progress: UploadProgress) => void
  onUploadError?: (error: string) => void
  accept?: string[]
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  thumbnailUrl?: string
}

interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error' | 'paused'
  error?: string
}

interface FileUploadState {
  files: File[]
  uploadProgress: Map<string, UploadProgress>
  uploadedFiles: UploadedFile[]
  isDragging: boolean
  isUploading: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadProgress,
  onUploadError,
  accept = ['.dcm', '.dicom', '.jpg', '.jpeg', '.png', '.tiff'],
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className = ''
}) => {
  const [state, setState] = useState<FileUploadState>({
    files: [],
    uploadProgress: new Map(),
    uploadedFiles: [],
    isDragging: false,
    isUploading: false
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  // 生成文件ID
  const generateFileId = (file: File): string => {
    return `${file.name}_${file.size}_${Date.now()}`
  }

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > maxSize) {
      return `文件大小超过限制 (${(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB)`
    }

    // 检查文件类型
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (accept.length > 0 && !accept.includes(fileExt)) {
      return `不支持的文件类型，支持: ${accept.join(', ')}`
    }

    return null
  }

  // 处理文件选择
  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    if (disabled) return

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of selectedFiles) {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'))
    }

    if (validFiles.length > 0) {
      // 检查文件数量限制
      const totalFiles = state.files.length + validFiles.length
      if (totalFiles > maxFiles) {
        onUploadError?.(`最多只能上传 ${maxFiles} 个文件`)
        return
      }

      setState(prev => ({
        ...prev,
        files: [...prev.files, ...validFiles]
      }))

      // 自动开始上传
      startUpload(validFiles)
    }
  }, [disabled, state.files.length, maxFiles, accept, maxSize, onUploadError])

  // 拖拽配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: accept.reduce((acc, ext) => {
      acc[`application/${ext.slice(1)}`] = [ext]
      return acc
    }, {} as Record<string, string[]>),
    maxSize,
    maxFiles,
    multiple,
    disabled,
    noClick: false,
    noKeyboard: false
  })

  // 开始上传
  const startUpload = async (filesToUpload: File[]) => {
    setState(prev => ({ ...prev, isUploading: true }))

    for (const file of filesToUpload) {
      const fileId = generateFileId(file)
      const controller = new AbortController()
      abortControllers.current.set(fileId, controller)

      // 初始化进度
      const progress: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      }

      setState(prev => ({
        ...prev,
        uploadProgress: new Map(prev.uploadProgress.set(fileId, progress))
      }))

      onUploadProgress?.(progress)

      try {
        // 检查文件大小，决定使用单文件上传还是分片上传
        if (file.size <= 50 * 1024 * 1024) { // 50MB以下使用单文件上传
          await uploadSingleFile(file, fileId, controller.signal)
        } else {
          await uploadChunkedFile(file, fileId, controller.signal)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          const errorProgress: UploadProgress = {
            fileId,
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: error.message
          }

          setState(prev => ({
            ...prev,
            uploadProgress: new Map(prev.uploadProgress.set(fileId, errorProgress))
          }))

          onUploadProgress?.(errorProgress)
          onUploadError?.(`${file.name}: ${error.message}`)
        }
      } finally {
        abortControllers.current.delete(fileId)
      }
    }

    setState(prev => ({ ...prev, isUploading: false }))
  }

  // 单文件上传
  const uploadSingleFile = async (file: File, fileId: string, signal: AbortSignal) => {
    const formData = new FormData()
    formData.append('file', file)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/v1/upload/single`, {
      method: 'POST',
      body: formData,
      signal,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`)
    }

    const result = await response.json()

    // 更新进度为完成
    const completedProgress: UploadProgress = {
      fileId,
      fileName: file.name,
      progress: 100,
      status: 'completed'
    }

    setState(prev => ({
      ...prev,
      uploadProgress: new Map(prev.uploadProgress.set(fileId, completedProgress)),
      uploadedFiles: [...prev.uploadedFiles, {
        id: result.file_id,
        name: result.filename,
        size: result.size,
        type: result.mime_type,
        url: result.upload_url,
        thumbnailUrl: `/api/v1/images/${result.file_id}/thumbnail`
      }]
    }))

    onUploadProgress?.(completedProgress)
  }

  // 分片上传
  const uploadChunkedFile = async (file: File, fileId: string, signal: AbortSignal) => {
    const chunkSize = 5 * 1024 * 1024 // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize)

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (signal.aborted) throw new Error('Upload aborted')

      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      // 计算分片哈希
      const chunkHash = await calculateMD5(chunk)

      const formData = new FormData()
      formData.append('file', chunk)
      formData.append('file_id', fileId)
      formData.append('chunk_index', chunkIndex.toString())
      formData.append('total_chunks', totalChunks.toString())
      formData.append('chunk_hash', chunkHash)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/upload/chunk`, {
        method: 'POST',
        body: formData,
        signal,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) {
        throw new Error(`分片上传失败: ${response.statusText}`)
      }

      // 更新进度
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      const progressUpdate: UploadProgress = {
        fileId,
        fileName: file.name,
        progress,
        status: 'uploading'
      }

      setState(prev => ({
        ...prev,
        uploadProgress: new Map(prev.uploadProgress.set(fileId, progressUpdate))
      }))

      onUploadProgress?.(progressUpdate)
    }

    // 完成上传
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const completeResponse = await fetch(`${apiUrl}/api/v1/upload/complete/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: new URLSearchParams({
        filename: file.name
      }),
      signal
    })

    if (!completeResponse.ok) {
      throw new Error(`完成上传失败: ${completeResponse.statusText}`)
    }

    const result = await completeResponse.json()

    // 更新为完成状态
    const completedProgress: UploadProgress = {
      fileId,
      fileName: file.name,
      progress: 100,
      status: 'completed'
    }

    setState(prev => ({
      ...prev,
      uploadProgress: new Map(prev.uploadProgress.set(fileId, completedProgress)),
      uploadedFiles: [...prev.uploadedFiles, {
        id: result.file_id,
        name: result.filename,
        size: result.size,
        type: result.mime_type,
        url: result.upload_url,
        thumbnailUrl: `/api/v1/images/${result.file_id}/thumbnail`
      }]
    }))

    onUploadProgress?.(completedProgress)
  }

  // 计算MD5哈希
  const calculateMD5 = async (data: Blob): Promise<string> => {
    const buffer = await data.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('MD5', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 取消上传
  const cancelUpload = (fileId: string) => {
    const controller = abortControllers.current.get(fileId)
    if (controller) {
      controller.abort()
      abortControllers.current.delete(fileId)
    }

    setState(prev => {
      const newProgress = new Map(prev.uploadProgress)
      newProgress.delete(fileId)
      return {
        ...prev,
        uploadProgress: newProgress
      }
    })
  }

  // 移除文件
  const removeFile = (index: number) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  // 清空所有文件
  const clearFiles = () => {
    // 取消所有上传
    abortControllers.current.forEach(controller => controller.abort())
    abortControllers.current.clear()

    setState({
      files: [],
      uploadProgress: new Map(),
      uploadedFiles: [],
      isDragging: false,
      isUploading: false
    })
  }

  return (
    <div className={`file-upload ${className}`}>
      {/* 拖拽上传区域 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">
            📁
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? '释放文件以上传' : '拖拽文件到此处或点击选择'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              支持格式: {accept.join(', ')} | 最大 {(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB | 最多 {maxFiles} 个文件
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {state.files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">文件列表 ({state.files.length})</h3>
            <button
              onClick={clearFiles}
              className="text-sm text-red-600 hover:text-red-800"
              disabled={state.isUploading}
            >
              清空所有
            </button>
          </div>

          <div className="space-y-3">
            {state.files.map((file, index) => {
              const fileId = generateFileId(file)
              const progress = state.uploadProgress.get(fileId)

              return (
                <div key={`${file.name}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
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
                          <span className="text-sm text-gray-600">
                            {progress.progress}%
                          </span>
                        </div>
                      )}

                      {progress?.status === 'uploading' && (
                        <button
                          onClick={() => cancelUpload(fileId)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          取消
                        </button>
                      )}

                      {!progress && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>

                  {progress?.error && (
                    <p className="text-sm text-red-600 mt-2">
                      错误: {progress.error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 上传完成的文件 */}
      {state.uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">已上传文件 ({state.uploadedFiles.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.uploadedFiles.map((file) => (
              <div key={file.id} className="border rounded-lg p-4">
                {file.thumbnailUrl && (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
