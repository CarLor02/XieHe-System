/**
 * 医疗影像诊断系统 - 患者管理 E2E 测试
 * 
 * 测试患者管理的完整业务流程
 * 
 * @author 医疗影像团队
 * @version 1.0.0
 */

import { test, expect, Page } from '@playwright/test';

// 测试数据
const testPatient = {
  name: '测试患者001',
  age: '35',
  gender: 'male',
  phone: '13800138001',
  email: 'test001@example.com',
  address: '北京市朝阳区测试街道123号',
  idCard: '110101198801010001',
  emergencyContact: '紧急联系人',
  emergencyPhone: '13900139001'
};

const updatedPatient = {
  name: '更新患者001',
  age: '36',
  address: '北京市海淀区更新街道456号'
};

test.describe('患者管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功并跳转到仪表板
    await expect(page).toHaveURL('/dashboard');
    
    // 导航到患者管理页面
    await page.click('[data-testid="patients-menu"]');
    await expect(page).toHaveURL('/patients');
  });

  test.describe('患者列表', () => {
    test('应该显示患者列表页面', async ({ page }) => {
      // 验证页面标题
      await expect(page.locator('[data-testid="page-title"]')).toHaveText('患者管理');
      
      // 验证搜索框存在
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
      
      // 验证添加患者按钮存在
      await expect(page.locator('[data-testid="add-patient-button"]')).toBeVisible();
      
      // 验证患者表格存在
      await expect(page.locator('[data-testid="patients-table"]')).toBeVisible();
    });

    test('应该能够搜索患者', async ({ page }) => {
      // 输入搜索关键词
      await page.fill('[data-testid="search-input"]', '张三');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // 等待搜索结果加载
      await page.waitForLoadState('networkidle');
      
      // 验证搜索结果
      const rows = page.locator('[data-testid="patient-row"]');
      const count = await rows.count();
      
      if (count > 0) {
        // 如果有结果，验证结果包含搜索关键词
        const firstRowName = await rows.first().locator('[data-testid="patient-name"]').textContent();
        expect(firstRowName).toContain('张三');
      } else {
        // 如果没有结果，验证显示空状态
        await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      }
    });

    test('应该能够分页浏览患者', async ({ page }) => {
      // 等待患者列表加载
      await page.waitForSelector('[data-testid="patients-table"]');
      
      // 检查是否有分页组件
      const pagination = page.locator('[data-testid="pagination"]');
      
      if (await pagination.isVisible()) {
        // 点击下一页
        await page.click('[data-testid="next-page-button"]');
        await page.waitForLoadState('networkidle');
        
        // 验证页码变化
        const currentPage = await page.locator('[data-testid="current-page"]').textContent();
        expect(currentPage).toBe('2');
        
        // 点击上一页
        await page.click('[data-testid="prev-page-button"]');
        await page.waitForLoadState('networkidle');
        
        // 验证回到第一页
        const firstPage = await page.locator('[data-testid="current-page"]').textContent();
        expect(firstPage).toBe('1');
      }
    });
  });

  test.describe('添加患者', () => {
    test('应该能够成功添加新患者', async ({ page }) => {
      // 点击添加患者按钮
      await page.click('[data-testid="add-patient-button"]');
      
      // 验证添加患者对话框打开
      await expect(page.locator('[data-testid="add-patient-dialog"]')).toBeVisible();
      
      // 填写患者信息
      await fillPatientForm(page, testPatient);
      
      // 提交表单
      await page.click('[data-testid="submit-button"]');
      
      // 等待提交完成
      await page.waitForLoadState('networkidle');
      
      // 验证成功消息
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('患者添加成功');
      
      // 验证对话框关闭
      await expect(page.locator('[data-testid="add-patient-dialog"]')).not.toBeVisible();
      
      // 验证新患者出现在列表中
      await page.fill('[data-testid="search-input"]', testPatient.name);
      await page.press('[data-testid="search-input"]', 'Enter');
      await page.waitForLoadState('networkidle');
      
      const patientRow = page.locator('[data-testid="patient-row"]').first();
      await expect(patientRow.locator('[data-testid="patient-name"]')).toContainText(testPatient.name);
      await expect(patientRow.locator('[data-testid="patient-phone"]')).toContainText(testPatient.phone);
    });

    test('应该验证必填字段', async ({ page }) => {
      // 点击添加患者按钮
      await page.click('[data-testid="add-patient-button"]');
      
      // 直接提交空表单
      await page.click('[data-testid="submit-button"]');
      
      // 验证错误消息
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="name-error"]')).toContainText('姓名不能为空');
      
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="phone-error"]')).toContainText('手机号不能为空');
    });

    test('应该验证手机号格式', async ({ page }) => {
      // 点击添加患者按钮
      await page.click('[data-testid="add-patient-button"]');
      
      // 填写无效手机号
      await page.fill('[data-testid="name-input"]', testPatient.name);
      await page.fill('[data-testid="phone-input"]', '123456');
      
      // 提交表单
      await page.click('[data-testid="submit-button"]');
      
      // 验证手机号格式错误消息
      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="phone-error"]')).toContainText('手机号格式不正确');
    });

    test('应该能够取消添加操作', async ({ page }) => {
      // 点击添加患者按钮
      await page.click('[data-testid="add-patient-button"]');
      
      // 填写部分信息
      await page.fill('[data-testid="name-input"]', testPatient.name);
      
      // 点击取消按钮
      await page.click('[data-testid="cancel-button"]');
      
      // 验证对话框关闭
      await expect(page.locator('[data-testid="add-patient-dialog"]')).not.toBeVisible();
      
      // 验证没有新患者添加
      await page.fill('[data-testid="search-input"]', testPatient.name);
      await page.press('[data-testid="search-input"]', 'Enter');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    });
  });

  test.describe('编辑患者', () => {
    test.beforeEach(async ({ page }) => {
      // 先添加一个测试患者
      await addTestPatient(page, testPatient);
    });

    test('应该能够编辑患者信息', async ({ page }) => {
      // 搜索并找到测试患者
      await searchPatient(page, testPatient.name);
      
      // 点击编辑按钮
      await page.click('[data-testid="edit-patient-button"]');
      
      // 验证编辑对话框打开
      await expect(page.locator('[data-testid="edit-patient-dialog"]')).toBeVisible();
      
      // 验证表单预填充了现有数据
      await expect(page.locator('[data-testid="name-input"]')).toHaveValue(testPatient.name);
      await expect(page.locator('[data-testid="phone-input"]')).toHaveValue(testPatient.phone);
      
      // 更新患者信息
      await page.fill('[data-testid="name-input"]', updatedPatient.name);
      await page.fill('[data-testid="age-input"]', updatedPatient.age);
      await page.fill('[data-testid="address-input"]', updatedPatient.address);
      
      // 提交更新
      await page.click('[data-testid="submit-button"]');
      
      // 等待更新完成
      await page.waitForLoadState('networkidle');
      
      // 验证成功消息
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('患者信息更新成功');
      
      // 验证更新后的信息
      await searchPatient(page, updatedPatient.name);
      const patientRow = page.locator('[data-testid="patient-row"]').first();
      await expect(patientRow.locator('[data-testid="patient-name"]')).toContainText(updatedPatient.name);
    });

    test('应该能够查看患者详情', async ({ page }) => {
      // 搜索并找到测试患者
      await searchPatient(page, testPatient.name);
      
      // 点击查看详情按钮
      await page.click('[data-testid="view-patient-button"]');
      
      // 验证详情页面
      await expect(page).toHaveURL(/\/patients\/[^\/]+$/);
      
      // 验证患者详情信息
      await expect(page.locator('[data-testid="patient-name"]')).toContainText(testPatient.name);
      await expect(page.locator('[data-testid="patient-phone"]')).toContainText(testPatient.phone);
      await expect(page.locator('[data-testid="patient-email"]')).toContainText(testPatient.email);
      
      // 验证相关功能按钮
      await expect(page.locator('[data-testid="edit-patient-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-image-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="view-history-button"]')).toBeVisible();
    });
  });

  test.describe('删除患者', () => {
    test.beforeEach(async ({ page }) => {
      // 先添加一个测试患者
      await addTestPatient(page, testPatient);
    });

    test('应该能够删除患者', async ({ page }) => {
      // 搜索并找到测试患者
      await searchPatient(page, testPatient.name);
      
      // 点击删除按钮
      await page.click('[data-testid="delete-patient-button"]');
      
      // 验证确认对话框
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-message"]')).toContainText('确定要删除该患者吗？');
      
      // 确认删除
      await page.click('[data-testid="confirm-delete-button"]');
      
      // 等待删除完成
      await page.waitForLoadState('networkidle');
      
      // 验证成功消息
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('患者删除成功');
      
      // 验证患者已从列表中移除
      await searchPatient(page, testPatient.name);
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    });

    test('应该能够取消删除操作', async ({ page }) => {
      // 搜索并找到测试患者
      await searchPatient(page, testPatient.name);
      
      // 点击删除按钮
      await page.click('[data-testid="delete-patient-button"]');
      
      // 取消删除
      await page.click('[data-testid="cancel-delete-button"]');
      
      // 验证确认对话框关闭
      await expect(page.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();
      
      // 验证患者仍在列表中
      const patientRow = page.locator('[data-testid="patient-row"]').first();
      await expect(patientRow.locator('[data-testid="patient-name"]')).toContainText(testPatient.name);
    });
  });
});

// 辅助函数
async function fillPatientForm(page: Page, patient: typeof testPatient) {
  await page.fill('[data-testid="name-input"]', patient.name);
  await page.fill('[data-testid="age-input"]', patient.age);
  await page.selectOption('[data-testid="gender-select"]', patient.gender);
  await page.fill('[data-testid="phone-input"]', patient.phone);
  await page.fill('[data-testid="email-input"]', patient.email);
  await page.fill('[data-testid="address-input"]', patient.address);
  await page.fill('[data-testid="id-card-input"]', patient.idCard);
  await page.fill('[data-testid="emergency-contact-input"]', patient.emergencyContact);
  await page.fill('[data-testid="emergency-phone-input"]', patient.emergencyPhone);
}

async function addTestPatient(page: Page, patient: typeof testPatient) {
  await page.click('[data-testid="add-patient-button"]');
  await fillPatientForm(page, patient);
  await page.click('[data-testid="submit-button"]');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}

async function searchPatient(page: Page, name: string) {
  await page.fill('[data-testid="search-input"]', name);
  await page.press('[data-testid="search-input"]', 'Enter');
  await page.waitForLoadState('networkidle');
}
