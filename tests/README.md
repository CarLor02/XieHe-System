# 医疗影像诊断系统 - 测试文档

## 📋 概述

本目录包含医疗影像诊断系统的所有测试代码，采用分层测试策略，确保系统的质量和可靠性。

## 📁 目录结构

```
tests/
├── README.md                    # 测试文档总览
├── unit/                        # 单元测试
│   ├── frontend/               # 前端单元测试
│   │   ├── components/         # 组件测试
│   │   ├── hooks/              # Hook测试
│   │   ├── utils/              # 工具函数测试
│   │   └── services/           # 服务层测试
│   └── backend/                # 后端单元测试
│       ├── models/             # 数据模型测试
│       ├── services/           # 业务逻辑测试
│       ├── utils/              # 工具函数测试
│       └── core/               # 核心功能测试
├── integration/                 # 集成测试
│   ├── api/                    # API集成测试
│   │   ├── auth/               # 认证API测试
│   │   ├── patients/           # 患者管理API测试
│   │   ├── images/             # 影像管理API测试
│   │   └── diagnosis/          # 诊断API测试
│   ├── database/               # 数据库集成测试
│   │   ├── models/             # 数据模型测试
│   │   ├── migrations/         # 数据迁移测试
│   │   └── queries/            # 查询测试
│   └── services/               # 服务集成测试
│       ├── ai/                 # AI服务测试
│       ├── dicom/              # DICOM处理测试
│       └── notification/       # 通知服务测试
├── e2e/                         # 端到端测试
│   ├── frontend/               # 前端E2E测试
│   │   ├── auth/               # 认证流程测试
│   │   ├── patient-management/ # 患者管理流程测试
│   │   ├── image-upload/       # 影像上传流程测试
│   │   └── diagnosis/          # 诊断流程测试
│   ├── backend/                # 后端E2E测试
│   │   ├── api-workflows/      # API工作流测试
│   │   └── data-processing/    # 数据处理流程测试
│   └── full-stack/             # 全栈E2E测试
│       ├── complete-workflows/ # 完整业务流程测试
│       └── performance/        # 性能测试
├── fixtures/                    # 测试数据和夹具
│   ├── data/                   # 测试数据文件
│   │   ├── patients.json       # 患者测试数据
│   │   ├── images/             # 测试影像文件
│   │   └── reports.json        # 报告测试数据
│   ├── mocks/                  # 模拟数据
│   │   ├── api-responses/      # API响应模拟
│   │   └── services/           # 服务模拟
│   └── factories/              # 数据工厂
│       ├── patient-factory.js  # 患者数据工厂
│       └── image-factory.js    # 影像数据工厂
├── utils/                       # 测试工具
│   ├── test-helpers.js         # 测试辅助函数
│   ├── setup.js                # 测试环境设置
│   ├── teardown.js             # 测试清理
│   └── custom-matchers.js      # 自定义匹配器
└── reports/                     # 测试报告
    ├── coverage/               # 覆盖率报告
    ├── performance/            # 性能测试报告
    └── screenshots/            # E2E测试截图
```

## 🧪 测试策略

### 1. 单元测试 (Unit Tests)
- **目标**: 测试单个函数、组件或模块
- **工具**: Jest, React Testing Library, pytest
- **覆盖率目标**: ≥ 80%
- **运行频率**: 每次代码提交

### 2. 集成测试 (Integration Tests)
- **目标**: 测试模块间的交互和数据流
- **工具**: Jest, Supertest, pytest
- **覆盖率目标**: ≥ 70%
- **运行频率**: 每次合并到主分支

### 3. 端到端测试 (E2E Tests)
- **目标**: 测试完整的用户场景和业务流程
- **工具**: Cypress, Playwright
- **覆盖率目标**: 核心业务流程100%
- **运行频率**: 每次发布前

## 🚀 运行测试

### 前端测试

```bash
# 进入前端目录
cd frontend

# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch

# 运行E2E测试
npm run test:e2e

# 打开Cypress测试界面
npm run test:e2e:open
```

### 后端测试

```bash
# 进入后端目录
cd backend

# 运行所有测试
python -m pytest

# 运行测试并生成覆盖率报告
python -m pytest --cov=app --cov-report=html

# 运行特定测试文件
python -m pytest tests/unit/test_models.py

# 运行集成测试
python -m pytest tests/integration/

# 运行性能测试
python -m pytest tests/performance/ -m performance
```

### 全项目测试

```bash
# 从根目录运行所有测试
npm run test

# 运行前端和后端测试
npm run test:frontend
npm run test:backend

# 运行E2E测试
npm run test:e2e
```

## 📊 测试配置

### Jest 配置 (前端)
```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.test.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    'hooks/**/*.{js,ts}',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### pytest 配置 (后端)
```ini
# backend/pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --disable-warnings
    --cov=app
    --cov-report=term-missing
    --cov-report=html:tests/reports/coverage
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    performance: Performance tests
    slow: Slow running tests
```

## 🔧 测试工具

### 前端测试工具
- **Jest**: JavaScript测试框架
- **React Testing Library**: React组件测试
- **Cypress**: E2E测试框架
- **MSW**: API模拟服务
- **@testing-library/user-event**: 用户交互模拟

### 后端测试工具
- **pytest**: Python测试框架
- **pytest-cov**: 覆盖率插件
- **pytest-asyncio**: 异步测试支持
- **httpx**: HTTP客户端测试
- **factory-boy**: 测试数据工厂

### 通用测试工具
- **Docker**: 测试环境隔离
- **GitHub Actions**: CI/CD测试自动化
- **SonarQube**: 代码质量分析

## 📝 测试编写规范

### 1. 命名规范
- 测试文件: `*.test.js`, `test_*.py`
- 测试函数: `test_should_do_something`
- 测试类: `TestClassName`

### 2. 测试结构
```javascript
// AAA模式: Arrange, Act, Assert
describe('Component/Function Name', () => {
  it('should do something when condition', () => {
    // Arrange - 准备测试数据
    const input = 'test input';
    
    // Act - 执行被测试的操作
    const result = functionUnderTest(input);
    
    // Assert - 验证结果
    expect(result).toBe('expected output');
  });
});
```

### 3. 测试数据管理
- 使用工厂模式创建测试数据
- 避免硬编码测试数据
- 每个测试独立，不依赖其他测试

### 4. 模拟和存根
- 模拟外部依赖（API、数据库等）
- 使用依赖注入便于测试
- 避免测试实际的外部服务

## 📈 持续集成

### GitHub Actions 配置
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:coverage
      - run: cd frontend && npm run test:e2e
  
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: cd backend && pip install -r requirements-dev.txt
      - run: cd backend && python -m pytest --cov=app
```

## 🎯 质量指标

### 覆盖率目标
- **单元测试**: ≥ 80%
- **集成测试**: ≥ 70%
- **E2E测试**: 核心流程 100%

### 性能指标
- **API响应时间**: < 200ms (95th percentile)
- **页面加载时间**: < 3s
- **数据库查询**: < 100ms

### 可靠性指标
- **测试通过率**: ≥ 99%
- **测试稳定性**: 无随机失败
- **回归测试**: 100%覆盖

---

**注意**: 编写测试时请遵循项目的编码规范和测试最佳实践。
