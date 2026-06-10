"""Schemas for the auth API endpoints."""

from pydantic import BaseModel, EmailStr, Field

class UserLogin(BaseModel):
    """用户登录请求模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名或邮箱")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    remember_me: bool = Field(default=False, description="记住我")


class UserRegister(BaseModel):
    """用户注册请求模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")
    full_name: str = Field(..., min_length=2, max_length=100, description="姓名")
    phone: str | None = Field(None, max_length=20, description="手机号")


class TokenRefresh(BaseModel):
    """令牌刷新请求模型"""
    refresh_token: str = Field(..., description="刷新令牌")


class PasswordReset(BaseModel):
    """密码重置请求模型"""
    email: EmailStr = Field(..., description="邮箱地址")


class PasswordResetConfirm(BaseModel):
    """密码重置确认模型"""
    token: str = Field(..., description="重置令牌")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")


class PasswordChange(BaseModel):
    """密码修改模型"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, max_length=128, description="新密码")
    confirm_password: str = Field(..., min_length=6, max_length=128, description="确认密码")


class UserUpdate(BaseModel):
    """用户信息更新模型"""
    phone: str | None = Field(None, max_length=20, description="手机号")
    real_name: str | None = Field(None, max_length=50, description="真实姓名")
    department_id: int | None = Field(None, description="部门ID")
    position: str | None = Field(None, max_length=50, description="职位")
    title: str | None = Field(None, max_length=50, description="职称")


class AvatarUploadSessionRequest(BaseModel):
    """头像上传会话请求."""

    filename: str = Field(..., min_length=1, max_length=255, description="原始文件名")
    size: int = Field(..., gt=0, description="文件大小")
    mime_type: str = Field(..., min_length=1, max_length=100, description="MIME类型")


class AvatarUploadPart(BaseModel):
    """头像上传分片地址."""

    part_number: int
    url: str


class AvatarUploadSessionResponse(BaseModel):
    """头像上传会话响应."""

    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: list[AvatarUploadPart]


class CompletedAvatarUploadPart(BaseModel):
    """已上传头像分片."""

    part_number: int
    etag: str


class AvatarUploadCompleteRequest(BaseModel):
    """头像上传完成请求."""

    upload_id: str
    parts: list[CompletedAvatarUploadPart] = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """令牌响应模型"""
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="过期时间（秒）")


class UserResponse(BaseModel):
    """用户信息响应模型"""
    id: int | str = Field(..., description="用户ID")  # 支持int或str类型
    username: str = Field(..., description="用户名")
    email: str = Field(..., description="邮箱")
    full_name: str = Field(..., description="姓名")
    phone: str | None = Field(None, description="手机号")
    real_name: str | None = Field(None, description="真实姓名")
    employee_id: str | None = Field(None, description="员工编号")
    department: str | None = Field(None, description="部门名称")
    department_id: int | None = Field(None, description="部门ID")
    position: str | None = Field(None, description="职位")
    title: str | None = Field(None, description="职称")
    is_active: bool = Field(..., description="是否激活")
    role: str = Field(default="doctor", description="用户角色")
    roles: list = Field(default=[], description="角色列表")
    permissions: list = Field(default=[], description="权限列表")
    is_superuser: bool = Field(default=False, description="是否超级管理员")
    is_system_admin: bool = Field(default=False, description="是否系统管理员")
    system_admin_level: int = Field(default=0, description="系统管理员级别：0-非，1-超级，2-二级")
    avatar_url: str | None = Field(None, description="头像临时访问地址")
    avatar_storage_bucket: str | None = Field(None, description="头像对象存储桶")
    avatar_object_key: str | None = Field(None, description="头像对象Key")
    created_at: str | None = Field(None, description="创建时间")
    updated_at: str | None = Field(None, description="更新时间")
