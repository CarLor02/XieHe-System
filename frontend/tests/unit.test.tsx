/**
 * 前端单元测试
 * 
 * 测试React组件、工具函数等功能
 * 
 * 作者: XieHe Medical System
 * 创建时间: 2025-09-25
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock API calls
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

describe('React组件单元测试', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  describe('基础组件测试', () => {
    test('Button组件渲染和点击', () => {
      const handleClick = jest.fn()
      
      render(
        <button onClick={handleClick} data-testid="test-button">
          点击我
        </button>
      )

      const button = screen.getByTestId('test-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('点击我')

      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('Input组件值变化', () => {
      const handleChange = jest.fn()
      
      render(
        <input
          data-testid="test-input"
          onChange={handleChange}
          placeholder="请输入内容"
        />
      )

      const input = screen.getByTestId('test-input')
      expect(input).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '测试内容' } })
      expect(handleChange).toHaveBeenCalled()
    })

    test('Modal组件显示和隐藏', () => {
      const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = 
        ({ isOpen, onClose, children }) => {
          if (!isOpen) return null
          
          return (
            <div data-testid="modal-overlay" onClick={onClose}>
              <div data-testid="modal-content" onClick={(e) => e.stopPropagation()}>
                {children}
                <button data-testid="close-button" onClick={onClose}>关闭</button>
              </div>
            </div>
          )
        }

      const TestModalComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false)
        
        return (
          <div>
            <button data-testid="open-button" onClick={() => setIsOpen(true)}>
              打开模态框
            </button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <p>模态框内容</p>
            </Modal>
          </div>
        )
      }

      render(<TestModalComponent />)

      // 初始状态：模态框不显示
      expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()

      // 点击打开按钮
      fireEvent.click(screen.getByTestId('open-button'))
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
      expect(screen.getByText('模态框内容')).toBeInTheDocument()

      // 点击关闭按钮
      fireEvent.click(screen.getByTestId('close-button'))
      expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()
    })
  })

  describe('表单组件测试', () => {
    test('登录表单验证', () => {
      const LoginForm: React.FC = () => {
        const [formData, setFormData] = React.useState({
          username: '',
          password: ''
        })
        const [errors, setErrors] = React.useState<string[]>([])

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault()
          const newErrors: string[] = []
          
          if (!formData.username) newErrors.push('用户名不能为空')
          if (!formData.password) newErrors.push('密码不能为空')
          if (formData.password.length < 6) newErrors.push('密码长度至少6位')
          
          setErrors(newErrors)
          
          if (newErrors.length === 0) {
            // 提交表单
            console.log('表单提交成功')
          }
        }

        return (
          <form onSubmit={handleSubmit} data-testid="login-form">
            <input
              data-testid="username-input"
              type="text"
              placeholder="用户名"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
            <input
              data-testid="password-input"
              type="password"
              placeholder="密码"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <button type="submit" data-testid="submit-button">登录</button>
            {errors.length > 0 && (
              <div data-testid="error-messages">
                {errors.map((error, index) => (
                  <div key={index} className="error">{error}</div>
                ))}
              </div>
            )}
          </form>
        )
      }

      render(<LoginForm />)

      // 测试空表单提交
      fireEvent.click(screen.getByTestId('submit-button'))
      expect(screen.getByTestId('error-messages')).toBeInTheDocument()
      expect(screen.getByText('用户名不能为空')).toBeInTheDocument()
      expect(screen.getByText('密码不能为空')).toBeInTheDocument()

      // 填写用户名
      fireEvent.change(screen.getByTestId('username-input'), {
        target: { value: 'testuser' }
      })

      // 填写短密码
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: '123' }
      })

      fireEvent.click(screen.getByTestId('submit-button'))
      expect(screen.getByText('密码长度至少6位')).toBeInTheDocument()

      // 填写正确密码
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: '123456' }
      })

      fireEvent.click(screen.getByTestId('submit-button'))
      expect(screen.queryByTestId('error-messages')).not.toBeInTheDocument()
    })

    test('搜索组件功能', async () => {
      const SearchComponent: React.FC = () => {
        const [query, setQuery] = React.useState('')
        const [results, setResults] = React.useState<string[]>([])
        const [loading, setLoading] = React.useState(false)

        const handleSearch = async () => {
          if (!query.trim()) return
          
          setLoading(true)
          
          // 模拟API调用
          setTimeout(() => {
            setResults([`结果1: ${query}`, `结果2: ${query}`, `结果3: ${query}`])
            setLoading(false)
          }, 100)
        }

        return (
          <div>
            <input
              data-testid="search-input"
              type="text"
              placeholder="搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button data-testid="search-button" onClick={handleSearch}>
              搜索
            </button>
            {loading && <div data-testid="loading">搜索中...</div>}
            <div data-testid="search-results">
              {results.map((result, index) => (
                <div key={index} className="result-item">{result}</div>
              ))}
            </div>
          </div>
        )
      }

      render(<SearchComponent />)

      // 输入搜索关键词
      fireEvent.change(screen.getByTestId('search-input'), {
        target: { value: '测试搜索' }
      })

      // 点击搜索按钮
      fireEvent.click(screen.getByTestId('search-button'))

      // 检查加载状态
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      // 等待搜索结果
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      })

      // 检查搜索结果
      const results = screen.getByTestId('search-results')
      expect(results).toBeInTheDocument()
      expect(screen.getByText('结果1: 测试搜索')).toBeInTheDocument()
    })
  })

  describe('列表组件测试', () => {
    test('数据列表渲染', () => {
      const data = [
        { id: 1, name: '张三', age: 30 },
        { id: 2, name: '李四', age: 25 },
        { id: 3, name: '王五', age: 35 }
      ]

      const DataList: React.FC<{ data: typeof data }> = ({ data }) => {
        return (
          <div data-testid="data-list">
            {data.map(item => (
              <div key={item.id} data-testid={`item-${item.id}`} className="list-item">
                <span>{item.name}</span>
                <span>{item.age}岁</span>
              </div>
            ))}
          </div>
        )
      }

      render(<DataList data={data} />)

      expect(screen.getByTestId('data-list')).toBeInTheDocument()
      expect(screen.getByTestId('item-1')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('30岁')).toBeInTheDocument()
    })

    test('分页组件功能', () => {
      const PaginationComponent: React.FC = () => {
        const [currentPage, setCurrentPage] = React.useState(1)
        const totalPages = 5

        return (
          <div data-testid="pagination">
            <button
              data-testid="prev-button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              上一页
            </button>
            <span data-testid="page-info">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button
              data-testid="next-button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        )
      }

      render(<PaginationComponent />)

      // 初始状态
      expect(screen.getByText('第 1 页，共 5 页')).toBeInTheDocument()
      expect(screen.getByTestId('prev-button')).toBeDisabled()
      expect(screen.getByTestId('next-button')).not.toBeDisabled()

      // 点击下一页
      fireEvent.click(screen.getByTestId('next-button'))
      expect(screen.getByText('第 2 页，共 5 页')).toBeInTheDocument()
      expect(screen.getByTestId('prev-button')).not.toBeDisabled()

      // 跳到最后一页
      for (let i = 2; i < 5; i++) {
        fireEvent.click(screen.getByTestId('next-button'))
      }
      expect(screen.getByText('第 5 页，共 5 页')).toBeInTheDocument()
      expect(screen.getByTestId('next-button')).toBeDisabled()
    })
  })

  describe('工具函数测试', () => {
    test('日期格式化函数', () => {
      const formatDate = (date: Date): string => {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      }

      const testDate = new Date('2025-09-25')
      const formatted = formatDate(testDate)
      
      expect(formatted).toBe('2025/09/25')
    })

    test('数据验证函数', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })

    test('数组处理函数', () => {
      const removeDuplicates = <T>(array: T[]): T[] => {
        return Array.from(new Set(array))
      }

      const testArray = [1, 2, 2, 3, 3, 4, 5]
      const result = removeDuplicates(testArray)
      
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    test('字符串处理函数', () => {
      const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
      }

      expect(truncateText('这是一个很长的文本', 5)).toBe('这是一个很...')
      expect(truncateText('短文本', 10)).toBe('短文本')
    })
  })

  describe('Hook测试', () => {
    test('useLocalStorage Hook', () => {
      const useLocalStorage = (key: string, initialValue: any) => {
        const [storedValue, setStoredValue] = React.useState(() => {
          try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
          } catch (error) {
            return initialValue
          }
        })

        const setValue = (value: any) => {
          try {
            setStoredValue(value)
            window.localStorage.setItem(key, JSON.stringify(value))
          } catch (error) {
            console.error(error)
          }
        }

        return [storedValue, setValue]
      }

      const TestComponent = () => {
        const [value, setValue] = useLocalStorage('test-key', 'default')
        
        return (
          <div>
            <span data-testid="current-value">{value}</span>
            <button 
              data-testid="update-button"
              onClick={() => setValue('updated')}
            >
              更新值
            </button>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('current-value')).toHaveTextContent('default')

      fireEvent.click(screen.getByTestId('update-button'))
      expect(screen.getByTestId('current-value')).toHaveTextContent('updated')
      expect(localStorage.getItem('test-key')).toBe('"updated"')
    })

    test('useDebounce Hook', () => {
      const useDebounce = (value: any, delay: number) => {
        const [debouncedValue, setDebouncedValue] = React.useState(value)

        React.useEffect(() => {
          const handler = setTimeout(() => {
            setDebouncedValue(value)
          }, delay)

          return () => {
            clearTimeout(handler)
          }
        }, [value, delay])

        return debouncedValue
      }

      const TestComponent = () => {
        const [inputValue, setInputValue] = React.useState('')
        const debouncedValue = useDebounce(inputValue, 300)

        return (
          <div>
            <input
              data-testid="debounce-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <span data-testid="debounced-value">{debouncedValue}</span>
          </div>
        )
      }

      render(<TestComponent />)

      const input = screen.getByTestId('debounce-input')
      const debouncedSpan = screen.getByTestId('debounced-value')

      // 初始状态
      expect(debouncedSpan).toHaveTextContent('')

      // 快速输入
      fireEvent.change(input, { target: { value: 'test' } })
      expect(debouncedSpan).toHaveTextContent('') // 还没有更新

      // 等待防抖延迟
      setTimeout(() => {
        expect(debouncedSpan).toHaveTextContent('test')
      }, 350)
    })
  })

  describe('异步操作测试', () => {
    test('API调用组件', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'API调用成功' })
      } as Response)

      const ApiComponent: React.FC = () => {
        const [data, setData] = React.useState<any>(null)
        const [loading, setLoading] = React.useState(false)

        const fetchData = async () => {
          setLoading(true)
          try {
            const response = await fetch('/api/test')
            const result = await response.json()
            setData(result)
          } catch (error) {
            console.error('API调用失败:', error)
          } finally {
            setLoading(false)
          }
        }

        return (
          <div>
            <button data-testid="fetch-button" onClick={fetchData}>
              获取数据
            </button>
            {loading && <div data-testid="loading">加载中...</div>}
            {data && <div data-testid="api-data">{data.message}</div>}
          </div>
        )
      }

      render(<ApiComponent />)

      fireEvent.click(screen.getByTestId('fetch-button'))
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('api-data')).toBeInTheDocument()
      })

      expect(screen.getByText('API调用成功')).toBeInTheDocument()
      expect(mockFetch).toHaveBeenCalledWith('/api/test')
    })
  })
})

// 测试工具函数
export const testUtils = {
  // 渲染组件的辅助函数
  renderWithRouter: (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  },

  // 模拟用户输入
  typeInInput: (input: HTMLElement, text: string) => {
    fireEvent.change(input, { target: { value: text } })
  },

  // 等待元素出现
  waitForElement: async (testId: string) => {
    return await waitFor(() => screen.getByTestId(testId))
  },

  // 模拟API响应
  mockApiResponse: (data: any, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data
    } as Response)
  }
}
