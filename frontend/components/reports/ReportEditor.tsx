'use client'

/**
 * 富文本报告编辑器组件
 * 
 * 支持图片插入、格式设置、实时预览等功能
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../ui/Button'

interface ReportSection {
  id: string
  name: string
  type: 'textarea' | 'select' | 'checklist' | 'structured'
  content: string
  required?: boolean
  placeholder?: string
  options?: string[]
}

interface ReportData {
  id?: number
  report_number?: string
  report_title: string
  clinical_history: string
  examination_technique: string
  findings: string
  impression: string
  recommendations: string
  structured_data?: Record<string, any>
  primary_diagnosis?: string
  secondary_diagnosis?: string
  notes?: string
  tags?: string[]
}

interface ReportEditorProps {
  initialData?: ReportData
  template?: {
    id: number
    template_name: string
    template_content: {
      sections: ReportSection[]
    }
  }
  onSave?: (data: ReportData) => void
  onPreview?: (data: ReportData) => void
  readOnly?: boolean
  className?: string
}

export default function ReportEditor({
  initialData,
  template,
  onSave,
  onPreview,
  readOnly = false,
  className = ''
}: ReportEditorProps) {
  const [reportData, setReportData] = useState<ReportData>({
    report_title: '',
    clinical_history: '',
    examination_technique: '',
    findings: '',
    impression: '',
    recommendations: '',
    primary_diagnosis: '',
    secondary_diagnosis: '',
    notes: '',
    tags: [],
    ...initialData
  })

  const [activeSection, setActiveSection] = useState<string>('findings')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')

  const editorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // 更新报告数据
  const updateReportData = useCallback((field: keyof ReportData, value: any) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // 插入文本到当前光标位置
  const insertTextAtCursor = useCallback((text: string) => {
    const activeEditor = editorRefs.current[activeSection]
    if (!activeEditor) return

    const start = activeEditor.selectionStart
    const end = activeEditor.selectionEnd
    const currentValue = activeEditor.value
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end)
    
    activeEditor.value = newValue
    updateReportData(activeSection as keyof ReportData, newValue)
    
    // 设置光标位置
    setTimeout(() => {
      activeEditor.selectionStart = activeEditor.selectionEnd = start + text.length
      activeEditor.focus()
    }, 0)
  }, [activeSection, updateReportData])

  // 格式化工具栏按钮
  const formatButtons = [
    { label: '粗体', action: () => insertTextAtCursor('**粗体文本**') },
    { label: '斜体', action: () => insertTextAtCursor('*斜体文本*') },
    { label: '下划线', action: () => insertTextAtCursor('__下划线文本__') },
    { label: '标题', action: () => insertTextAtCursor('\n## 标题\n') },
    { label: '列表', action: () => insertTextAtCursor('\n- 列表项\n- 列表项\n') },
    { label: '编号', action: () => insertTextAtCursor('\n1. 编号项\n2. 编号项\n') }
  ]

  // 常用医学术语
  const medicalTerms = [
    '未见明显异常',
    '建议进一步检查',
    '建议定期复查',
    '请结合临床',
    '双肺纹理清晰',
    '心影大小正常',
    '纵隔居中',
    '胸膜腔未见积液',
    '肝脏大小形态正常',
    '胆囊壁光滑',
    '脾脏未见异常',
    '双肾大小形态正常'
  ]

  // 保存报告
  const handleSave = async () => {
    if (readOnly) return
    
    setIsSaving(true)
    try {
      await onSave?.(reportData)
    } catch (error) {
      console.error('保存报告失败:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 预览报告
  const handlePreview = () => {
    onPreview?.(reportData)
    setIsPreviewMode(!isPreviewMode)
  }

  // 插入图片
  const handleInsertImage = () => {
    if (selectedImageUrl) {
      insertTextAtCursor(`\n![图片描述](${selectedImageUrl})\n`)
      setShowImageDialog(false)
      setSelectedImageUrl('')
    }
  }

  // 渲染编辑器工具栏
  const renderToolbar = () => (
    <div className="border-b border-gray-200 p-4 bg-gray-50">
      <div className="flex flex-wrap gap-2 mb-4">
        {/* 格式化按钮 */}
        <div className="flex gap-1">
          {formatButtons.map((btn, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={btn.action}
              disabled={readOnly}
              className="text-xs"
            >
              {btn.label}
            </Button>
          ))}
        </div>
        
        {/* 插入按钮 */}
        <div className="flex gap-1 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImageDialog(true)}
            disabled={readOnly}
            className="text-xs"
          >
            📷 插入图片
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => insertTextAtCursor('\n---\n')}
            disabled={readOnly}
            className="text-xs"
          >
            ➖ 分割线
          </Button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="text-xs"
          >
            👁️ {isPreviewMode ? '编辑' : '预览'}
          </Button>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs"
            >
              {isSaving ? '保存中...' : '💾 保存'}
            </Button>
          )}
        </div>
      </div>

      {/* 常用术语快捷插入 */}
      <div className="flex flex-wrap gap-1">
        <span className="text-sm text-gray-600 mr-2">常用术语:</span>
        {medicalTerms.slice(0, 6).map((term, index) => (
          <button
            key={index}
            onClick={() => insertTextAtCursor(term)}
            disabled={readOnly}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            {term}
          </button>
        ))}
        <button
          onClick={() => {/* 显示更多术语 */}}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          更多...
        </button>
      </div>
    </div>
  )

  // 渲染报告段落编辑器
  const renderSectionEditor = (sectionKey: string, label: string, placeholder: string) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="text-xs text-gray-500">
          {reportData[sectionKey as keyof ReportData]?.toString().length || 0} 字符
        </div>
      </div>
      
      {isPreviewMode ? (
        <div className="min-h-[120px] p-3 border border-gray-300 rounded-md bg-gray-50 whitespace-pre-wrap">
          {reportData[sectionKey as keyof ReportData] || placeholder}
        </div>
      ) : (
        <textarea
          ref={el => editorRefs.current[sectionKey] = el}
          value={reportData[sectionKey as keyof ReportData]?.toString() || ''}
          onChange={(e) => updateReportData(sectionKey as keyof ReportData, e.target.value)}
          onFocus={() => setActiveSection(sectionKey)}
          placeholder={placeholder}
          disabled={readOnly}
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-y"
          rows={5}
        />
      )}
    </div>
  )

  // 渲染报告头部信息
  const renderReportHeader = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          报告标题
        </label>
        <input
          type="text"
          value={reportData.report_title}
          onChange={(e) => updateReportData('report_title', e.target.value)}
          placeholder="请输入报告标题"
          disabled={readOnly}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          主要诊断
        </label>
        <input
          type="text"
          value={reportData.primary_diagnosis || ''}
          onChange={(e) => updateReportData('primary_diagnosis', e.target.value)}
          placeholder="请输入主要诊断"
          disabled={readOnly}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          次要诊断
        </label>
        <input
          type="text"
          value={reportData.secondary_diagnosis || ''}
          onChange={(e) => updateReportData('secondary_diagnosis', e.target.value)}
          placeholder="请输入次要诊断"
          disabled={readOnly}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          标签
        </label>
        <input
          type="text"
          value={reportData.tags?.join(', ') || ''}
          onChange={(e) => updateReportData('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
          placeholder="请输入标签，用逗号分隔"
          disabled={readOnly}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>
    </div>
  )

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* 工具栏 */}
      {renderToolbar()}
      
      {/* 报告内容 */}
      <div className="p-6">
        {/* 报告头部信息 */}
        {renderReportHeader()}
        
        {/* 报告段落 */}
        <div className="space-y-6">
          {renderSectionEditor('clinical_history', '临床病史', '请输入患者临床病史...')}
          {renderSectionEditor('examination_technique', '检查技术', '请输入检查技术和方法...')}
          {renderSectionEditor('findings', '检查所见', '请输入详细的检查所见...')}
          {renderSectionEditor('impression', '诊断意见', '请输入诊断意见和结论...')}
          {renderSectionEditor('recommendations', '建议', '请输入后续建议和处理意见...')}
          {renderSectionEditor('notes', '备注', '请输入其他备注信息...')}
        </div>
      </div>

      {/* 插入图片对话框 */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">插入图片</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图片URL
              </label>
              <input
                type="text"
                value={selectedImageUrl}
                onChange={(e) => setSelectedImageUrl(e.target.value)}
                placeholder="请输入图片URL"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImageDialog(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleInsertImage}
                disabled={!selectedImageUrl}
              >
                插入
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
