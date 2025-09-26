/**
 * 医疗影像诊断系统 - 测试辅助函数
 * 
 * 提供通用的测试工具函数，包括：
 * - 数据生成器
 * - 测试环境设置
 * - 断言辅助函数
 * - 模拟数据创建
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

/**
 * 创建测试用的 Redux Store
 */
export function createTestStore(initialState = {}) {
  return configureStore({
    reducer: {
      // 添加你的 reducers
    },
    preloadedState: initialState,
  });
}

/**
 * 创建测试用的 React Query Client
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * 渲染带有所有 Provider 的组件
 */
export function renderWithProviders(
  ui,
  {
    initialState = {},
    store = createTestStore(initialState),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );
  }

  return {
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * 等待元素出现
 */
export async function waitForElement(selector, timeout = 5000) {
  return waitFor(() => screen.getByTestId(selector), { timeout });
}

/**
 * 等待元素消失
 */
export async function waitForElementToBeRemoved(selector, timeout = 5000) {
  return waitFor(() => expect(screen.queryByTestId(selector)).not.toBeInTheDocument(), { timeout });
}

/**
 * 模拟用户输入
 */
export async function typeIntoInput(input, text) {
  const user = userEvent.setup();
  await user.clear(input);
  await user.type(input, text);
}

/**
 * 模拟文件上传
 */
export async function uploadFile(input, file) {
  const user = userEvent.setup();
  await user.upload(input, file);
}

/**
 * 创建模拟文件
 */
export function createMockFile(name = 'test.jpg', type = 'image/jpeg', size = 1024) {
  return new File(['test content'], name, { type, size });
}

/**
 * 创建模拟 DICOM 文件
 */
export function createMockDicomFile(name = 'test.dcm', size = 2048) {
  return new File(['dicom content'], name, { type: 'application/dicom', size });
}

/**
 * 模拟 API 响应
 */
export function mockApiResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * 模拟 API 错误响应
 */
export function mockApiError(message = 'API Error', status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
  };
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * 生成随机数字
 */
export function generateRandomNumber(min = 1, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机日期
 */
export function generateRandomDate(start = new Date(2020, 0, 1), end = new Date()) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * 生成测试患者数据
 */
export function generateTestPatient(overrides = {}) {
  return {
    id: generateRandomString(8),
    name: `测试患者${generateRandomNumber()}`,
    age: generateRandomNumber(18, 80),
    gender: Math.random() > 0.5 ? 'male' : 'female',
    phone: `138${generateRandomNumber(10000000, 99999999)}`,
    email: `patient${generateRandomNumber()}@test.com`,
    address: '测试地址',
    createdAt: generateRandomDate().toISOString(),
    ...overrides,
  };
}

/**
 * 生成测试影像数据
 */
export function generateTestImage(overrides = {}) {
  return {
    id: generateRandomString(8),
    patientId: generateRandomString(8),
    filename: `test_image_${generateRandomNumber()}.dcm`,
    modality: ['CT', 'MR', 'US', 'XR'][generateRandomNumber(0, 3)],
    studyDate: generateRandomDate().toISOString(),
    description: '测试影像描述',
    size: generateRandomNumber(1024, 10240),
    status: 'uploaded',
    ...overrides,
  };
}

/**
 * 生成测试诊断数据
 */
export function generateTestDiagnosis(overrides = {}) {
  return {
    id: generateRandomString(8),
    patientId: generateRandomString(8),
    imageId: generateRandomString(8),
    result: '测试诊断结果',
    confidence: Math.random(),
    aiModel: 'test-model-v1',
    createdAt: generateRandomDate().toISOString(),
    status: 'completed',
    ...overrides,
  };
}

/**
 * 生成测试报告数据
 */
export function generateTestReport(overrides = {}) {
  return {
    id: generateRandomString(8),
    patientId: generateRandomString(8),
    diagnosisId: generateRandomString(8),
    title: '测试报告',
    content: '这是一个测试报告的内容',
    createdBy: generateRandomString(6),
    createdAt: generateRandomDate().toISOString(),
    status: 'draft',
    ...overrides,
  };
}

/**
 * 延迟执行
 */
export function delay(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 模拟网络延迟
 */
export async function simulateNetworkDelay(min = 100, max = 500) {
  const delay = generateRandomNumber(min, max);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 清理测试数据
 */
export function cleanupTestData() {
  // 清理本地存储
  localStorage.clear();
  sessionStorage.clear();
  
  // 清理模拟数据
  jest.clearAllMocks();
}

/**
 * 断言元素可见
 */
export function expectElementToBeVisible(element) {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
}

/**
 * 断言元素不可见
 */
export function expectElementToBeHidden(element) {
  expect(element).not.toBeVisible();
}

/**
 * 断言加载状态
 */
export function expectLoadingState() {
  expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
}

/**
 * 断言错误状态
 */
export function expectErrorState(message) {
  expect(screen.getByTestId('error-message')).toBeInTheDocument();
  if (message) {
    expect(screen.getByText(message)).toBeInTheDocument();
  }
}

/**
 * 断言成功状态
 */
export function expectSuccessState(message) {
  expect(screen.getByTestId('success-message')).toBeInTheDocument();
  if (message) {
    expect(screen.getByText(message)).toBeInTheDocument();
  }
}

// 导出所有测试工具
export {
  render,
  screen,
  fireEvent,
  waitFor,
  userEvent,
};
