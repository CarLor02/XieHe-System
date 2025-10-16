# 团队加入审批流程完整文档

## 概述

本文档详细描述了用户申请加入团队、撤销申请以及管理员审批的完整流程。

## 功能特性

- ✅ 用户可以搜索并申请加入团队
- ✅ 申请理由为可选项，无字数限制
- ✅ 用户可以撤销自己的待审批申请
- ✅ 管理员可以查看、通过或驳回加入申请
- ✅ UI 自动更新，无需刷新页面
- ✅ 完整的权限验证和状态管理

---

## 1. 数据模型

### 1.1 团队加入申请状态枚举

```python
class TeamJoinRequestStatus(str, enum.Enum):
    """团队加入申请状态"""
    PENDING = "pending"      # 待审批
    APPROVED = "approved"    # 已通过
    REJECTED = "rejected"    # 已拒绝
    CANCELLED = "cancelled"  # 已撤销（用户主动）
```

### 1.2 团队成员角色枚举

```python
class TeamMembershipRole(str, enum.Enum):
    """团队成员角色枚举"""
    ADMIN = "admin"    # 管理员（团队创建者默认为管理员）
    DOCTOR = "doctor"  # 医生（普通成员）
```

### 1.3 核心数据表

#### TeamJoinRequest（团队加入申请表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 申请ID（主键）|
| team_id | Integer | 团队ID |
| user_id | Integer | 申请人ID |
| message | Text | 申请理由（可选，允许为空）|
| status | Enum | 申请状态 |
| created_at | DateTime | 申请时间 |
| reviewed_at | DateTime | 审核时间 |
| reviewer_id | Integer | 审核人ID |

#### TeamMembership（团队成员表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 成员关系ID |
| team_id | Integer | 团队ID |
| user_id | Integer | 用户ID |
| role | Enum | 成员角色（admin/doctor）|
| status | Enum | 成员状态 |
| joined_at | DateTime | 加入时间 |

---

## 2. 用户申请流程

### 2.1 搜索团队

**接口**: `GET /api/v1/permissions/teams/search`

**请求参数**:
```json
{
  "keyword": "放射科"
}
```

**响应数据**:
```json
{
  "results": [
    {
      "id": 1,
      "name": "放射科团队",
      "description": "医学影像诊断团队",
      "hospital": "协和医院",
      "department": "放射科",
      "leader_name": "张医生",
      "member_count": 15,
      "max_members": 50,
      "is_member": false,
      "join_status": null,
      "join_request_id": null,
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

**字段说明**:
- `is_member`: 当前用户是否已是该团队成员
- `join_status`: 当前用户的申请状态（pending/approved/rejected/cancelled/null）
- `join_request_id`: 待审批申请的ID（仅在 status=pending 时有值）

### 2.2 提交加入申请

**接口**: `POST /api/v1/permissions/teams/{team_id}/apply`

**请求体**:
```json
{
  "message": "希望加入贵团队学习交流"  // 可选，可为空字符串
}
```

**响应数据**:
```json
{
  "request_id": 123,
  "message": "申请已提交，等待审核",
  "status": "pending",
  "requested_at": "2025-10-16T10:00:00Z"
}
```

**业务规则**:
1. ✅ 申请理由为**可选项**，可以不填或填写空字符串
2. ✅ 已是团队成员的用户不能再次申请
3. ✅ 如果已有待审批申请，直接返回该申请信息
4. ✅ 如果之前的申请被拒绝或撤销，可以重新申请（创建新申请）

**前端UI更新**:
- 提交成功后，团队卡片状态立即更新为"待审批"
- 显示"撤销"按钮
- 无需刷新页面

### 2.3 撤销申请

**接口**: `DELETE /api/v1/permissions/teams/{team_id}/join-requests/{request_id}`

**响应数据**:
```json
{
  "message": "申请已撤销",
  "status": "cancelled",
  "request": {
    "id": 123,
    "team_id": 1,
    "applicant_id": 9,
    "applicant_username": "user01",
    "applicant_real_name": "用户一",
    "applicant_email": "user01@example.com",
    "message": "希望加入贵团队学习交流",
    "status": "cancelled",
    "requested_at": "2025-10-16T10:00:00Z",
    "reviewed_at": "2025-10-16T10:30:00Z",
    "reviewer_id": 9
  }
}
```

**业务规则**:
1. ✅ 只能撤销**自己**提交的申请
2. ✅ 只能撤销**待审批**状态的申请
3. ✅ 撤销后申请状态变为 `cancelled`
4. ✅ `reviewer_id` 记录为撤销用户自己的ID

**前端UI更新**:
- 撤销成功后，团队卡片状态立即恢复为可申请
- "待审批"标签和"撤销"按钮消失
- 显示"申请加入"按钮
- 无需刷新页面

**交互细节**:
- 点击"撤销"按钮前弹出确认对话框
- 撤销过程中按钮显示"撤销中..."并禁用
- 撤销成功显示成功提示信息

---

## 3. 管理员审批流程

### 3.1 查看加入申请列表

**接口**: `GET /api/v1/permissions/teams/{team_id}/join-requests`

**请求参数**:
- `status` (可选): 筛选状态 `pending`/`approved`/`rejected`

**响应数据**:
```json
{
  "items": [
    {
      "id": 123,
      "team_id": 1,
      "applicant_id": 9,
      "applicant_username": "user01",
      "applicant_real_name": "用户一",
      "applicant_email": "user01@example.com",
      "message": "希望加入贵团队学习交流",
      "status": "pending",
      "requested_at": "2025-10-16T10:00:00Z",
      "reviewed_at": null,
      "reviewer_id": null
    }
  ],
  "total": 1,
  "pending_count": 1
}
```

**权限验证**:
- ✅ 必须是该团队的**管理员**才能查看申请列表
- ✅ 非团队成员或普通成员（doctor）无权查看

### 3.2 审批申请（通过或拒绝）

**接口**: `POST /api/v1/permissions/teams/{team_id}/join-requests/{request_id}/review`

**请求体**:
```json
{
  "decision": "approve"  // 或 "reject"
}
```

**响应数据（通过）**:
```json
{
  "message": "加入申请已通过",
  "status": "approved",
  "request": {
    "id": 123,
    "team_id": 1,
    "applicant_id": 9,
    "applicant_username": "user01",
    "applicant_real_name": "用户一",
    "applicant_email": "user01@example.com",
    "message": "希望加入贵团队学习交流",
    "status": "approved",
    "requested_at": "2025-10-16T10:00:00Z",
    "reviewed_at": "2025-10-16T11:00:00Z",
    "reviewer_id": 1
  }
}
```

**响应数据（拒绝）**:
```json
{
  "message": "加入申请已拒绝",
  "status": "rejected",
  "request": { /* 同上 */ }
}
```

**业务规则**:
1. ✅ 只有团队**管理员**可以审批
2. ✅ 只能审批**待审批**状态的申请
3. ✅ 审批通过后自动创建团队成员关系（角色为 `doctor`）
4. ✅ 审批拒绝后不创建成员关系，但保留申请记录
5. ✅ 记录审批时间和审批人ID

**审批通过的后续操作**:
- 申请状态更新为 `approved`
- 在 `team_memberships` 表创建新记录：
  - `role`: `doctor`（普通成员）
  - `status`: `active`（激活状态）
  - `joined_at`: 审批时间
- 申请人成为正式团队成员

---

## 4. 前端UI交互

### 4.1 团队搜索页面

**位置**: `/app/permissions/TeamManagement.tsx`

**功能组件**:

1. **搜索栏**
   - 输入关键词搜索团队
   - 按名称、描述、医院、科室模糊匹配

2. **团队卡片**
   - 显示团队基本信息
   - 根据状态显示不同操作按钮

**状态显示规则**:

| 条件 | 显示内容 |
|------|---------|
| `is_member: true` | 绿色标签"已加入" |
| `join_status: "pending"` | 黄色标签"待审批" + 红色"撤销"按钮 |
| 其他（未申请）| 蓝色"申请加入"按钮 |

### 4.2 申请弹窗

**触发**: 点击"申请加入"按钮

**内容**:
- 团队名称（只读）
- 申请理由输入框（可选，支持多行文本）
- 提示文字："可选填写您希望加入团队的缘由、能力或计划贡献"
- 取消和提交按钮

**提交逻辑**:
1. 发送API请求
2. 请求成功后：
   - 关闭弹窗
   - 更新团队卡片状态为"待审批"
   - 显示成功提示
   - **无需刷新页面**

### 4.3 撤销确认对话框

**触发**: 点击"撤销"按钮

**内容**: 原生确认对话框 "确定要撤销该申请吗？"

**撤销逻辑**:
1. 用户确认后发送DELETE请求
2. 请求成功后：
   - 更新团队卡片状态为可申请
   - 显示成功提示
   - **无需刷新页面**

### 4.4 成员管理页面

**位置**: `/app/permissions/MemberManagement.tsx`

**管理员功能**:

1. **待审批列表**
   - 显示所有待审批的申请
   - 包含申请人信息和申请理由
   - 提供"通过"和"驳回"按钮

2. **审批操作**
   - 点击"通过"：调用审批API，决策为 `approve`
   - 点击"驳回"：调用审批API，决策为 `reject`
   - 审批成功后更新列表
   - **无需刷新页面**

---

## 5. API端点汇总

| 方法 | 端点 | 说明 | 权限要求 |
|------|------|------|---------|
| GET | `/api/v1/permissions/teams/search` | 搜索团队 | 已登录 |
| GET | `/api/v1/permissions/teams/my` | 获取我的团队 | 已登录 |
| POST | `/api/v1/permissions/teams/{team_id}/apply` | 申请加入团队 | 已登录 |
| DELETE | `/api/v1/permissions/teams/{team_id}/join-requests/{request_id}` | 撤销申请 | 申请人本人 |
| GET | `/api/v1/permissions/teams/{team_id}/join-requests` | 查看申请列表 | 团队管理员 |
| POST | `/api/v1/permissions/teams/{team_id}/join-requests/{request_id}/review` | 审批申请 | 团队管理员 |

---

## 6. 状态转换图

```
未申请 ──申请加入──> 待审批 ──管理员通过──> 已通过（成为成员）
                       │
                       ├──管理员拒绝──> 已拒绝
                       │
                       └──用户撤销──> 已撤销

已拒绝 ──重新申请──> 待审批
已撤销 ──重新申请──> 待审批
```

---

## 7. 权限验证矩阵

| 操作 | 普通用户 | 申请人 | 团队成员 | 团队管理员 |
|------|---------|--------|---------|-----------|
| 搜索团队 | ✅ | ✅ | ✅ | ✅ |
| 申请加入 | ✅ | ✅（非成员）| ❌ | ❌ |
| 撤销申请 | ❌ | ✅（自己的）| ❌ | ❌ |
| 查看申请列表 | ❌ | ❌ | ❌ | ✅ |
| 审批申请 | ❌ | ❌ | ❌ | ✅ |

---

## 8. 错误处理

### 8.1 常见错误码

| 状态码 | 错误场景 |
|--------|---------|
| 400 | 申请已处理/重复撤销/无效决策 |
| 403 | 无权限操作（非管理员/非申请人）|
| 404 | 团队不存在/申请不存在 |
| 500 | 服务器内部错误 |

### 8.2 错误提示示例

```json
{
  "error": true,
  "message": "只能撤销待审核的申请",
  "status_code": 400,
  "path": "/api/v1/permissions/teams/1/join-requests/123",
  "method": "DELETE"
}
```

---

## 9. 测试用例

### 9.1 后端测试

运行测试:
```bash
cd backend
../.venv/bin/pytest tests/test_team_management.py -v
```

**测试覆盖**:
- ✅ `test_apply_to_team`: 正常申请加入
- ✅ `test_apply_to_team_without_message`: 无理由申请
- ✅ `test_cancel_join_request`: 撤销申请
- ✅ `test_join_requests_listing_and_approval`: 审批流程
- ✅ `test_list_team_members`: 成员列表
- ✅ `test_create_team`: 创建团队
- ✅ `test_invite_member`: 邀请成员

### 9.2 手动测试步骤

**场景1: 用户申请加入团队**
1. 登录普通用户账号
2. 进入权限管理 → 团队管理
3. 搜索团队关键词
4. 点击"申请加入"
5. 选择性填写或留空申请理由
6. 提交申请
7. ✅ 验证：卡片状态立即变为"待审批"

**场景2: 用户撤销申请**
1. 在待审批状态下点击"撤销"
2. 确认撤销操作
3. ✅ 验证：卡片状态立即恢复为"申请加入"

**场景3: 管理员审批**
1. 登录管理员账号
2. 进入权限管理 → 成员管理
3. 切换到待审批申请列表
4. 点击"通过"或"驳回"
5. ✅ 验证：
   - 通过：申请人成为团队成员
   - 驳回：申请状态变为已拒绝

---

## 10. 最佳实践

### 10.1 前端开发建议

1. **状态同步**
   - 所有API操作成功后立即更新本地状态
   - 避免不必要的页面刷新

2. **用户体验**
   - 提供加载状态反馈
   - 显示明确的成功/失败提示
   - 使用确认对话框防止误操作

3. **错误处理**
   - 捕获并展示友好的错误信息
   - 记录详细错误日志便于调试

### 10.2 后端开发建议

1. **权限验证**
   - 在每个敏感操作前验证用户权限
   - 使用装饰器统一权限检查逻辑

2. **数据完整性**
   - 使用事务确保数据一致性
   - 添加数据库约束防止异常数据

3. **性能优化**
   - 使用 `joinedload` 预加载关联数据
   - 添加适当的数据库索引

---

## 11. 版本更新记录

### v2.0 (2025-10-16)
- ✅ 申请理由改为可选项，无字数限制
- ✅ UI自动更新，无需刷新页面
- ✅ 完善撤销功能和测试用例

### v1.0 (2025-10-15)
- ✅ 初始版本：基础申请和审批功能
- ✅ 强制要求申请理由
- ✅ 支持撤销和审批操作

---

## 12. 常见问题 (FAQ)

**Q: 用户撤销申请后能否重新申请？**  
A: 可以。撤销后可以立即重新提交申请。

**Q: 管理员能否撤销用户的申请？**  
A: 不能。只有申请人自己可以撤销申请，管理员只能通过或拒绝。

**Q: 申请被拒绝后能否再次申请？**  
A: 可以。被拒绝后可以重新提交新的申请。

**Q: 申请理由是否必填？**  
A: 不是。申请理由为可选项，可以不填写。

**Q: 团队创建者的角色是什么？**  
A: 团队创建者默认为管理员（admin）角色。

**Q: 审批通过后用户的角色是什么？**  
A: 普通成员的角色为医生（doctor）。

---

## 13. 联系方式

如有问题或建议，请联系开发团队。
