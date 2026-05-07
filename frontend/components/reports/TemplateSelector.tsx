'use client'

/**
 * 报告模板选择组件
 * 
 * 提供报告模板的选择和预览功能
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'

interface ReportTemplate {
  id: number
  template_name: string
  template_type: 'RADIOLOGY' | 'PATHOLOGY' | 'ULTRASOUND' | 'ENDOSCOPY'
  modality?: string
  body_part?: string
  description?: string
  template_content: {
    sections: Array<{
      id: string
      name: string
      type: 'textarea' | 'select' | 'checklist' | 'structured'
      content?: string
      required?: boolean
      placeholder?: string
      options?: string[]
    }>
  }
  usage_count?: number
  last_used_at?: string
  is_default?: boolean
  created_at: string
  updated_at: string
}

interface TemplateSelectorProps {
  onSelect: (template: ReportTemplate) => void
  onCancel?: () => void
  selectedTemplateId?: number
  filterType?: string
  filterModality?: string
  filterBodyPart?: string
  className?: string
}

export default function TemplateSelector({
  onSelect,
  onCancel,
  selectedTemplateId,
  filterType,
  filterModality,
  filterBodyPart,
  className = ''
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState(filterType || 'all')
  const [modalityFilter, setModalityFilter] = useState(filterModality || 'all')
  const [bodyPartFilter, setBodyPartFilter] = useState(filterBodyPart || 'all')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // 模拟获取模板数据
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      try {
        // 模拟API调用
        const mockTemplates: ReportTemplate[] = [
          {
            id: 1,
            template_name: '胸部CT报告模板',
            template_type: 'RADIOLOGY',
            modality: 'CT',
            body_part: '胸部',
            description: '标准胸部CT检查报告模板，适用于常规胸部CT检查',
            template_content: {
              sections: [
                {
                  id: 'clinical_history',
                  name: '临床病史',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入患者临床病史和症状...'
                },
                {
                  id: 'examination_technique',
                  name: '检查技术',
                  type: 'textarea',
                  content: '胸部CT平扫+增强扫描，层厚5mm，层距5mm',
                  placeholder: '请输入检查技术和参数...'
                },
                {
                  id: 'findings',
                  name: '检查所见',
                  type: 'textarea',
                  required: true,
                  placeholder: '请详细描述检查所见...'
                },
                {
                  id: 'impression',
                  name: '诊断意见',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入诊断意见和结论...'
                },
                {
                  id: 'recommendations',
                  name: '建议',
                  type: 'textarea',
                  placeholder: '请输入后续建议和处理意见...'
                }
              ]
            },
            usage_count: 156,
            last_used_at: '2025-09-24T10:30:00Z',
            is_default: true,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-09-20T15:30:00Z'
          },
          {
            id: 2,
            template_name: '腹部CT报告模板',
            template_type: 'RADIOLOGY',
            modality: 'CT',
            body_part: '腹部',
            description: '标准腹部CT检查报告模板，适用于腹部CT平扫和增强检查',
            template_content: {
              sections: [
                {
                  id: 'clinical_history',
                  name: '临床病史',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入患者临床病史和症状...'
                },
                {
                  id: 'examination_technique',
                  name: '检查技术',
                  type: 'textarea',
                  content: '腹部CT平扫+三期增强扫描（动脉期、门脉期、延迟期）',
                  placeholder: '请输入检查技术和参数...'
                },
                {
                  id: 'findings',
                  name: '检查所见',
                  type: 'structured',
                  required: true,
                  placeholder: '请按器官系统描述检查所见...'
                },
                {
                  id: 'impression',
                  name: '诊断意见',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入诊断意见和结论...'
                },
                {
                  id: 'recommendations',
                  name: '建议',
                  type: 'textarea',
                  placeholder: '请输入后续建议和处理意见...'
                }
              ]
            },
            usage_count: 89,
            last_used_at: '2025-09-23T14:20:00Z',
            is_default: false,
            created_at: '2025-01-15T00:00:00Z',
            updated_at: '2025-09-15T10:15:00Z'
          },
          {
            id: 3,
            template_name: '头颅MRI报告模板',
            template_type: 'RADIOLOGY',
            modality: 'MRI',
            body_part: '头颅',
            description: '标准头颅MRI检查报告模板，适用于头颅MRI平扫和增强检查',
            template_content: {
              sections: [
                {
                  id: 'clinical_history',
                  name: '临床病史',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入患者临床病史和症状...'
                },
                {
                  id: 'examination_technique',
                  name: '检查技术',
                  type: 'textarea',
                  content: '头颅MRI平扫+增强扫描，包括T1WI、T2WI、FLAIR、DWI序列',
                  placeholder: '请输入检查技术和序列...'
                },
                {
                  id: 'findings',
                  name: '检查所见',
                  type: 'textarea',
                  required: true,
                  placeholder: '请详细描述各序列检查所见...'
                },
                {
                  id: 'impression',
                  name: '诊断意见',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入诊断意见和结论...'
                },
                {
                  id: 'recommendations',
                  name: '建议',
                  type: 'textarea',
                  placeholder: '请输入后续建议和处理意见...'
                }
              ]
            },
            usage_count: 67,
            last_used_at: '2025-09-22T09:45:00Z',
            is_default: false,
            created_at: '2025-02-01T00:00:00Z',
            updated_at: '2025-09-10T16:20:00Z'
          },
          {
            id: 4,
            template_name: '超声检查报告模板',
            template_type: 'ULTRASOUND',
            modality: '超声',
            body_part: '腹部',
            description: '标准腹部超声检查报告模板，适用于肝胆胰脾肾超声检查',
            template_content: {
              sections: [
                {
                  id: 'clinical_history',
                  name: '临床病史',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入患者临床病史和症状...'
                },
                {
                  id: 'examination_technique',
                  name: '检查技术',
                  type: 'textarea',
                  content: '腹部超声检查，探头频率2-5MHz',
                  placeholder: '请输入检查技术和参数...'
                },
                {
                  id: 'findings',
                  name: '检查所见',
                  type: 'structured',
                  required: true,
                  placeholder: '请按器官系统描述超声所见...'
                },
                {
                  id: 'impression',
                  name: '超声诊断',
                  type: 'textarea',
                  required: true,
                  placeholder: '请输入超声诊断意见...'
                },
                {
                  id: 'recommendations',
                  name: '建议',
                  type: 'textarea',
                  placeholder: '请输入后续建议...'
                }
              ]
            },
            usage_count: 234,
            last_used_at: '2025-09-24T11:15:00Z',
            is_default: true,
            created_at: '2025-01-10T00:00:00Z',
            updated_at: '2025-09-18T14:30:00Z'
          }
        ]

        setTemplates(mockTemplates)
      } catch (error) {
        console.error('获取模板失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // 筛选模板
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || template.template_type === typeFilter
    const matchesModality = modalityFilter === 'all' || template.modality === modalityFilter
    const matchesBodyPart = bodyPartFilter === 'all' || template.body_part === bodyPartFilter
    
    return matchesSearch && matchesType && matchesModality && matchesBodyPart
  })

  // 获取唯一的模态和部位选项
  const modalities = [...new Set(templates.map(t => t.modality).filter(Boolean))]
  const bodyParts = [...new Set(templates.map(t => t.body_part).filter(Boolean))]

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 处理模板选择
  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    onSelect(template)
  }

  // 渲染模板预览
  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">模板预览</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedTemplate.template_name}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
              </div>
              
              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-800 mb-3">报告段落结构</h5>
                <div className="space-y-3">
                  {selectedTemplate.template_content.sections.map((section, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{section.name}</span>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {section.type}
                          </span>
                          {section.required && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                              必填
                            </span>
                          )}
                        </div>
                      </div>
                      {section.content && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {section.content}
                        </div>
                      )}
                      {section.placeholder && (
                        <div className="text-sm text-gray-400 italic">
                          {section.placeholder}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                关闭
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  handleSelectTemplate(selectedTemplate)
                  setShowPreview(false)
                }}
              >
                使用此模板
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载模板中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">选择报告模板</h2>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
        </div>

        {/* 搜索和筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="搜索模板名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有类型</option>
            <option value="RADIOLOGY">影像学</option>
            <option value="PATHOLOGY">病理学</option>
            <option value="ULTRASOUND">超声</option>
            <option value="ENDOSCOPY">内镜</option>
          </select>
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有模态</option>
            {modalities.map(modality => (
              <option key={modality} value={modality}>{modality}</option>
            ))}
          </select>
          <select
            value={bodyPartFilter}
            onChange={(e) => setBodyPartFilter(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有部位</option>
            {bodyParts.map(bodyPart => (
              <option key={bodyPart} value={bodyPart}>{bodyPart}</option>
            ))}
          </select>
        </div>

        {/* 模板列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                selectedTemplateId === template.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {template.template_name}
                    {template.is_default && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        默认
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      {template.template_type}
                    </span>
                    {template.modality && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {template.modality}
                      </span>
                    )}
                    {template.body_part && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {template.body_part}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>使用 {template.usage_count} 次</span>
                <span>最后使用: {formatDate(template.last_used_at || template.updated_at)}</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTemplate(template)
                    setShowPreview(true)
                  }}
                  className="flex-1"
                >
                  👁️ 预览
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectTemplate(template)
                  }}
                  className="flex-1"
                >
                  选择
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">📋</div>
            <p className="text-gray-500">没有找到匹配的模板</p>
          </div>
        )}
      </div>

      {/* 模板预览对话框 */}
      {showPreview && renderTemplatePreview()}
    </div>
  )
}
