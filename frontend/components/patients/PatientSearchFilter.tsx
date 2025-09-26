'use client'

/**
 * 患者搜索筛选组件
 * 
 * 提供患者搜索、高级筛选、排序等功能
 * 
 * @author XieHe Medical System
 * @created 2025-09-24
 */

import { useState, useEffect } from 'react'

// 搜索筛选参数接口
export interface SearchFilters {
  search?: string
  gender?: string
  ageMin?: number
  ageMax?: number
  hasAllergies?: boolean
  hasChronicDisease?: boolean
  isActive?: boolean
  createdAfter?: Date
  createdBefore?: Date
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface PatientSearchFilterProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: () => void
  onReset: () => void
  loading?: boolean
  resultCount?: number
}

export default function PatientSearchFilter({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  loading = false,
  resultCount
}: PatientSearchFilterProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)

  // 同步外部filters到本地状态
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // 更新单个筛选条件
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // 清除单个筛选条件
  const clearFilter = (key: keyof SearchFilters) => {
    const newFilters = { ...localFilters }
    delete newFilters[key]
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // 重置所有筛选条件
  const handleReset = () => {
    setLocalFilters({})
    onReset()
    setIsAdvancedOpen(false)
  }

  // 获取活跃筛选条件数量
  const getActiveFiltersCount = () => {
    const { search, sortBy, sortOrder, ...otherFilters } = localFilters
    return Object.keys(otherFilters).filter(key => 
      otherFilters[key as keyof typeof otherFilters] !== undefined
    ).length
  }

  // 渲染筛选标签
  const renderFilterTags = () => {
    const tags = []
    
    if (localFilters.gender) {
      tags.push(
        <span key="gender" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          性别: {localFilters.gender}
          <button 
            className="ml-1 text-blue-600 hover:text-blue-800" 
            onClick={() => clearFilter('gender')}
          >
            ×
          </button>
        </span>
      )
    }
    
    if (localFilters.ageMin !== undefined || localFilters.ageMax !== undefined) {
      const ageText = localFilters.ageMin && localFilters.ageMax 
        ? `${localFilters.ageMin}-${localFilters.ageMax}岁`
        : localFilters.ageMin 
        ? `≥${localFilters.ageMin}岁`
        : `≤${localFilters.ageMax}岁`
      
      tags.push(
        <span key="age" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          年龄: {ageText}
          <button 
            className="ml-1 text-green-600 hover:text-green-800" 
            onClick={() => {
              clearFilter('ageMin')
              clearFilter('ageMax')
            }}
          >
            ×
          </button>
        </span>
      )
    }
    
    if (localFilters.isActive !== undefined) {
      tags.push(
        <span key="status" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          状态: {localFilters.isActive ? '正常' : '停用'}
          <button 
            className="ml-1 text-purple-600 hover:text-purple-800" 
            onClick={() => clearFilter('isActive')}
          >
            ×
          </button>
        </span>
      )
    }
    
    return tags
  }

  const activeFiltersCount = getActiveFiltersCount()
  const filterTags = renderFilterTags()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="ri-search-line w-5 h-5 mr-2"></i>
            患者搜索
          </h3>
          <p className="text-gray-600 text-sm">
            搜索和筛选患者信息
            {resultCount !== undefined && (
              <span className="ml-2 font-medium">
                找到 {resultCount} 名患者
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i className="ri-filter-line w-4 h-4 mr-1"></i>
            高级筛选
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <i className="ri-close-line w-4 h-4 mr-1"></i>
              清除
            </button>
          )}
        </div>
      </div>
      
      {/* 基础搜索 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <i className="ri-search-line w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="搜索患者姓名、ID、电话、身份证号..."
            value={localFilters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button 
          onClick={onSearch} 
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* 筛选标签 */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterTags}
        </div>
      )}

      {/* 高级筛选 */}
      {isAdvancedOpen && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 性别筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="ri-user-line w-4 h-4 inline mr-1"></i>
                性别
              </label>
              <select 
                value={localFilters.gender || ''} 
                onChange={(e) => updateFilter('gender', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="未知">未知</option>
              </select>
            </div>

            {/* 年龄范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">年龄范围</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="最小"
                  value={localFilters.ageMin || ''}
                  onChange={(e) => updateFilter('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  min={0}
                  max={150}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="最大"
                  value={localFilters.ageMax || ''}
                  onChange={(e) => updateFilter('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  min={0}
                  max={150}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">患者状态</label>
              <select 
                value={localFilters.isActive === undefined ? '' : localFilters.isActive.toString()} 
                onChange={(e) => updateFilter('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="true">正常</option>
                <option value="false">停用</option>
              </select>
            </div>

            {/* 排序方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
              <div className="flex gap-2">
                <select 
                  value={localFilters.sortBy || 'created_at'} 
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">创建时间</option>
                  <option value="updated_at">更新时间</option>
                  <option value="name">姓名</option>
                  <option value="age">年龄</option>
                  <option value="patient_id">患者ID</option>
                </select>
                <select 
                  value={localFilters.sortOrder || 'desc'} 
                  onChange={(e) => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              重置筛选
            </button>
            <button
              onClick={onSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
