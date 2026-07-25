'use client'

/**
 * 报告预览组件
 * 
 * 提供报告的格式化预览和打印功能
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React from 'react'
import { Button } from '../ui/Button'

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
  examination_date?: string
  report_date?: string
  reporting_physician?: string
  reviewing_physician?: string
  patient_name?: string
  patient_age?: number
  patient_gender?: string
  patient_id_number?: string
  notes?: string
  tags?: string[]
  ai_assisted?: boolean
  ai_confidence?: number
}

interface ReportPreviewProps {
  reportData: ReportData
  onEdit?: () => void
  onExport?: (format: 'pdf' | 'word' | 'image') => void
  onPrint?: () => void
  showActions?: boolean
  className?: string
}

export default function ReportPreview({
  reportData,
  onEdit,
  onExport,
  onPrint,
  showActions = true,
  className = ''
}: ReportPreviewProps) {

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 渲染Markdown格式文本
  const renderMarkdownText = (text: string) => {
    if (!text) return null
    
    return text
      .split('\n')
      .map((line, index) => {
        // 处理标题
        if (line.startsWith('## ')) {
          return (
            <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-gray-800">
              {line.substring(3)}
            </h3>
          )
        }
        
        // 处理列表
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 list-disc">
              {line.substring(2)}
            </li>
          )
        }
        
        // 处理编号列表
        if (/^\d+\.\s/.test(line)) {
          return (
            <li key={index} className="ml-4 list-decimal">
              {line.replace(/^\d+\.\s/, '')}
            </li>
          )
        }
        
        // 处理分割线
        if (line.trim() === '---') {
          return <hr key={index} className="my-4 border-gray-300" />
        }
        
        // 处理图片
        const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
        if (imageMatch) {
          return (
            <div key={index} className="my-4 text-center">
              {/* 用户报告中的任意图片没有可靠的尺寸元数据，保留原生图片比例。 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageMatch[2]}
                alt={imageMatch[1]}
                className="max-w-full h-auto mx-auto border border-gray-300 rounded"
              />
              {imageMatch[1] && (
                <p className="text-sm text-gray-600 mt-2">{imageMatch[1]}</p>
              )}
            </div>
          )
        }
        
        // 处理普通文本（支持粗体、斜体、下划线）
        let processedLine = line
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>')
        processedLine = processedLine.replace(/__(.*?)__/g, '<u>$1</u>')
        
        if (processedLine.trim() === '') {
          return <br key={index} />
        }
        
        return (
          <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processedLine }} />
        )
      })
  }

  // 渲染报告段落
  const renderSection = (title: string, content: string, required = false) => {
    if (!content && !required) return null
    
    return (
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
          {title}
        </h3>
        <div className="text-gray-700 leading-relaxed">
          {content ? renderMarkdownText(content) : (
            <p className="text-gray-400 italic">暂无内容</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* 操作栏 */}
      {showActions && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">报告预览</span>
            {reportData.ai_assisted && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                🤖 AI辅助 ({Math.round((reportData.ai_confidence || 0) * 100)}%)
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                ✏️ 编辑
              </Button>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                🖨️ 打印
              </Button>
            )}
            {onExport && (
              <div className="relative group">
                <Button variant="outline" size="sm">
                  📤 导出 ▼
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => onExport('pdf')}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    📄 PDF格式
                  </button>
                  <button
                    onClick={() => onExport('word')}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    📝 Word格式
                  </button>
                  <button
                    onClick={() => onExport('image')}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    🖼️ 图片格式
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 报告内容 */}
      <div className="p-8 max-w-4xl mx-auto">
        {/* 报告头部 */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {reportData.report_title || '医学影像诊断报告'}
          </h1>
          {reportData.report_number && (
            <p className="text-sm text-gray-600">
              报告编号: {reportData.report_number}
            </p>
          )}
        </div>

        {/* 患者信息 */}
        <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex">
              <span className="w-20 text-gray-600">姓名:</span>
              <span className="font-medium">{reportData.patient_name || '未填写'}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-600">年龄:</span>
              <span>{reportData.patient_age || '未填写'}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-600">性别:</span>
              <span>{reportData.patient_gender || '未填写'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex">
              <span className="w-20 text-gray-600">检查日期:</span>
              <span>{formatDate(reportData.examination_date) || '未填写'}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-600">报告日期:</span>
              <span>{formatDate(reportData.report_date) || '未填写'}</span>
            </div>
            <div className="flex">
              <span className="w-20 text-gray-600">报告医师:</span>
              <span>{reportData.reporting_physician || '未填写'}</span>
            </div>
          </div>
        </div>

        {/* 诊断信息 */}
        {(reportData.primary_diagnosis || reportData.secondary_diagnosis) && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h3 className="text-base font-semibold text-blue-800 mb-3">诊断结果</h3>
            {reportData.primary_diagnosis && (
              <div className="mb-2">
                <span className="font-medium text-blue-700">主要诊断: </span>
                <span className="text-blue-900">{reportData.primary_diagnosis}</span>
              </div>
            )}
            {reportData.secondary_diagnosis && (
              <div>
                <span className="font-medium text-blue-700">次要诊断: </span>
                <span className="text-blue-900">{reportData.secondary_diagnosis}</span>
              </div>
            )}
          </div>
        )}

        {/* 报告内容段落 */}
        <div className="space-y-6">
          {renderSection('临床病史', reportData.clinical_history)}
          {renderSection('检查技术', reportData.examination_technique)}
          {renderSection('检查所见', reportData.findings, true)}
          {renderSection('诊断意见', reportData.impression, true)}
          {renderSection('建议', reportData.recommendations)}
          {renderSection('备注', reportData.notes || '')}
        </div>

        {/* 标签 */}
        {reportData.tags && reportData.tags.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">标签:</span>
              {reportData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 报告尾部 */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="h-16 border-b border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-600">报告医师签名</p>
              <p className="text-sm text-gray-800 font-medium">
                {reportData.reporting_physician || ''}
              </p>
            </div>
            {reportData.reviewing_physician && (
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">审核医师签名</p>
                <p className="text-sm text-gray-800 font-medium">
                  {reportData.reviewing_physician}
                </p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>本报告仅对送检样本负责</p>
            <p>报告日期: {formatDate(reportData.report_date)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
