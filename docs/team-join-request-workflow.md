# 团队加入申请工作流

## 功能概述

本文档描述团队加入申请的完整工作流程，包括用户申请、撤销申请和管理员审批三个主要功能。

## 功能特性

### 1. 用户申请加入团队

用户可以搜索并申请加入团队，申请时需要填写详细的申请理由。

**前端界面**：
- 搜索团队界面显示"申请加入"按钮
- 点击后弹出申请表单，要求填写申请理由（5-1000字符）
- 提交后，按钮状态变为"待审批"

**API端点**：
```
POST /api/v1/permissions/teams/{team_id}/apply
Body: { "message": "申请理由" }
```

**业务规则**：
- 申请理由不能为空，至少5个字符
- 已是团队成员无法再次申请
- 已有待审批申请时，重复提交会返回现有申请

### 2. 用户撤销申请

用户可以撤销自己提交的待审批申请。

**前端界面**：
- 在"待审批"状态旁显示"撤销"按钮
- 点击后需要确认操作
- 撤销成功后，状态恢复为可申请

**API端点**：
```
DELETE /api/v1/permissions/teams/{team_id}/join-requests/{request_id}
```

**业务规则**：
- 只能撤销自己提交的申请
- 只能撤销"待审批"状态的申请
- 已审批（通过/拒绝）的申请无法撤销

### 3. 管理员审批申请

团队管理员可以在团队管理界面查看和审批加入申请。

**前端界面**：
- 成员管理页面显示"待审批申请"列表
- 显示申请人信息、申请理由和申请时间
- 提供"通过"和"驳回"两个操作按钮

**API端点**：
```
GET /api/v1/permissions/teams/{team_id}/join-requests
POST /api/v1/permissions/teams/{team_id}/join-requests/{request_id}/review
Body: { "decision": "approve" | "reject" }
```

**业务规则**：
- 只有团队管理员可以审批
- 审批通过后，申请人自动成为团队成员（医生角色）
- 审批后记录审批人和审批时间
- 已审批的申请无法再次审批

## 数据模型

### TeamJoinRequest 表字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 申请ID |
| team_id | Integer | 团队ID |
| user_id | Integer | 申请人ID |
| message | Text | 申请理由 |
| status | Enum | 状态：pending/approved/rejected/cancelled |
| created_at | DateTime | 申请时间 |
| reviewed_at | DateTime | 审批时间 |
| reviewer_id | Integer | 审批人ID（撤销时为申请人自己） |

### 状态流转

```
[创建] → pending → approved (审批通过)
                → rejected (审批拒绝)
                → cancelled (用户撤销)
```

## 前端组件

### TeamManagement.tsx
- **功能**：团队搜索和申请
- **关键状态**：
  - `searchResults`: 搜索结果列表
  - `joinModalOpen`: 申请表单模态框
  - `cancellingRequestId`: 正在撤销的申请ID

### MemberManagement.tsx
- **功能**：团队成员和申请管理
- **显示内容**：
  - 团队成员列表（带角色标识）
  - 待审批申请列表
  - 审批操作按钮

## 测试覆盖

### 后端测试（backend/tests/test_team_management.py）

1. `test_apply_to_team`: 测试申请加入团队
2. `test_apply_to_team_requires_message`: 测试申请理由必填
3. `test_join_requests_listing_and_approval`: 测试管理员查看和审批
4. `test_cancel_join_request`: 测试用户撤销申请

所有测试均已通过。

## API响应示例

### 提交申请响应
```json
{
  "request_id": 123,
  "message": "申请已提交，等待团队审核",
  "status": "pending",
  "requested_at": "2025-10-16T09:30:00Z"
}
```

### 查看申请列表响应
```json
{
  "items": [
    {
      "id": 123,
      "team_id": 1,
      "applicant_id": 5,
      "applicant_username": "doctor_zhang",
      "applicant_real_name": "张医生",
      "applicant_email": "zhang@example.com",
      "message": "我在放射科工作多年，希望加入团队共同提升诊断质量",
      "status": "pending",
      "requested_at": "2025-10-16T09:30:00Z",
      "reviewed_at": null,
      "reviewer_id": null
    }
  ],
  "total": 1,
  "pending_count": 1
}
```

### 审批响应
```json
{
  "message": "加入申请已通过",
  "status": "approved",
  "request": {
    "id": 123,
    "team_id": 1,
    "applicant_id": 5,
    "applicant_username": "doctor_zhang",
    "applicant_real_name": "张医生",
    "applicant_email": "zhang@example.com",
    "message": "我在放射科工作多年，希望加入团队共同提升诊断质量",
    "status": "approved",
    "requested_at": "2025-10-16T09:30:00Z",
    "reviewed_at": "2025-10-16T10:00:00Z",
    "reviewer_id": 2
  }
}
```

## 权限控制

- **申请加入**：任何已认证用户
- **撤销申请**：申请人本人
- **查看申请列表**：团队管理员
- **审批申请**：团队管理员

## 后续优化建议

1. 添加申请通知功能，管理员收到新申请时发送通知
2. 添加审批结果通知，申请人获知审批结果
3. 支持批量审批功能
4. 添加申请历史记录查看
5. 支持申请驳回时填写驳回理由
