# Build Error 修复文档

## 问题描述

构建时出现错误：
```
Module not found: Can't resolve '@mui/material'
./app/permissions/TeamInvitations.tsx (4:1)
```

## 原因分析

`TeamInvitations.tsx` 组件使用了 Material-UI (`@mui/material`)，但项目使用的是 Tailwind CSS，没有安装 Material-UI 依赖。

## 解决方案

将 `TeamInvitations.tsx` 组件从 Material-UI 重写为 Tailwind CSS 样式。

### 修改内容

**文件**: `frontend/app/permissions/TeamInvitations.tsx`

#### 移除的依赖
- `@mui/material` 的所有组件（Box, Card, Button, Dialog 等）
- `@mui/icons-material` 的所有图标

#### 替换为
- Tailwind CSS 类名
- Remix Icon (`ri-*` 类名，项目已使用）
- 原生 HTML 元素 + Tailwind 样式

### 主要变更

1. **布局组件**
   - `Box` → `<div>` + Tailwind flex/grid 类
   - `Card` → `<div>` + `rounded-lg border bg-white` 等类
   - `Stack` → `<div>` + `space-y-*` 类

2. **按钮组件**
   - `Button` → `<button>` + Tailwind 按钮样式
   - `variant="contained"` → `bg-*-600 text-white`
   - `variant="outlined"` → `border border-*-300 bg-white`

3. **图标**
   - `<MailIcon />` → `<i className="ri-mail-line"></i>`
   - `<GroupIcon />` → `<i className="ri-team-line"></i>`
   - `<PersonIcon />` → `<i className="ri-user-line"></i>`
   - `<CheckCircleIcon />` → `<i className="ri-checkbox-circle-line"></i>`
   - `<CancelIcon />` → `<i className="ri-close-circle-line"></i>`

4. **对话框**
   - `Dialog` → 自定义模态框（fixed + z-50 + backdrop）
   - `DialogTitle` → `<h3>` + Tailwind 标题样式
   - `DialogContent` → `<div>` + padding
   - `DialogActions` → `<div>` + flex justify-end

5. **提示信息**
   - `Alert` → 自定义提示框（border + bg-*-50 + text-*-700）
   - `CircularProgress` → 自定义加载动画（animate-spin）

6. **标签**
   - `Chip` → `<span>` + `rounded-full px-2.5 py-0.5`

### 样式对比

#### Material-UI
```tsx
<Box display="flex" justifyContent="center" alignItems="center">
  <CircularProgress />
</Box>
```

#### Tailwind CSS
```tsx
<div className="flex items-center justify-center">
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
</div>
```

### 功能保持不变

- ✅ 显示邀请列表
- ✅ 接受/拒绝邀请
- ✅ 确认对话框
- ✅ 加载状态
- ✅ 错误提示
- ✅ 成功提示
- ✅ 空状态显示
- ✅ 时间格式化
- ✅ 角色标签

## 验证

运行以下命令验证修复：

```bash
cd frontend
npm run build
```

应该不再出现 `@mui/material` 相关的错误。

## 相关文件

- `frontend/app/permissions/TeamInvitations.tsx` - 已修复
- `frontend/app/permissions/TeamManagement.tsx` - 导入该组件
- `frontend/package.json` - 确认没有 MUI 依赖

## 注意事项

1. 项目使用 Tailwind CSS 作为主要样式框架
2. 图标使用 Remix Icon (`ri-*` 类名)
3. 所有新组件应使用 Tailwind CSS，不要引入新的 UI 框架
4. 保持与现有组件的样式一致性

## 后续建议

如果需要更复杂的 UI 组件，可以考虑：
1. 使用 Headless UI（项目已安装 `@headlessui/react`）
2. 使用 Radix UI（项目已安装部分组件）
3. 自定义 Tailwind 组件

这些都与 Tailwind CSS 兼容，不会引入额外的样式冲突。

