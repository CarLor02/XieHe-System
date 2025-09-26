#!/usr/bin/env python3
"""
用户权限表初始化脚本
创建用户、角色、权限、部门相关表结构和初始数据
"""

import sys
import os
import hashlib
import secrets
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# 创建Base
Base = declarative_base()

# 重新定义模型以避免配置依赖
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# 数据库配置
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "123456"
MYSQL_DATABASE = "xiehe_medical"

# 构建数据库URL
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset=utf8mb4"
)

# 用户角色关联表
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
    Column('assigned_at', DateTime, default=func.now()),
    Column('is_active', Boolean, default=True),
    UniqueConstraint('user_id', 'role_id', name='uk_user_role')
)

# 角色权限关联表
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
    Column('granted_at', DateTime, default=func.now()),
    Column('is_active', Boolean, default=True),
    UniqueConstraint('role_id', 'permission_id', name='uk_role_permission')
)

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    salt = Column(String(32), nullable=False)
    real_name = Column(String(50), nullable=False)
    employee_id = Column(String(20), unique=True, nullable=True)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    position = Column(String(50), nullable=True)
    title = Column(String(50), nullable=True)
    status = Column(String(20), default='active', nullable=False)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    roles = relationship("Role", secondary=user_roles, back_populates="users")
    department = relationship("Department", back_populates="users")

class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    level = Column(Integer, default=1)
    status = Column(String(20), default='active', nullable=False)
    is_system = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    users = relationship(User, secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    module = Column(String(50), nullable=False)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    status = Column(String(20), default='active', nullable=False)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    roles = relationship(Role, secondary=role_permissions, back_populates="permissions")

class Department(Base):
    __tablename__ = 'departments'

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    level = Column(Integer, default=1)
    path = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0)
    status = Column(String(20), default='active', nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    users = relationship(User, back_populates="department")
    parent = relationship("Department", remote_side=[id], back_populates="children")
    children = relationship("Department", back_populates="parent")

def create_password_hash(password: str, salt: str = None) -> tuple:
    """创建密码哈希"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    # 使用PBKDF2算法
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000  # 迭代次数
    ).hex()
    
    return password_hash, salt

def init_database():
    """初始化数据库表结构"""
    print("🔧 初始化数据库表结构...")
    
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL, echo=True)
        
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        
        print("✅ 数据库表结构创建成功!")
        return engine
        
    except Exception as e:
        print(f"❌ 数据库表结构创建失败: {e}")
        raise

def init_departments(session):
    """初始化部门数据"""
    print("🏥 初始化部门数据...")
    
    departments_data = [
        {
            "code": "ROOT",
            "name": "协和医院",
            "full_name": "北京协和医院",
            "description": "医院根部门",
            "level": 1,
            "path": "/ROOT",
            "sort_order": 1
        },
        {
            "code": "ADMIN",
            "name": "行政管理部",
            "full_name": "行政管理部",
            "description": "负责医院行政管理工作",
            "parent_code": "ROOT",
            "level": 2,
            "path": "/ROOT/ADMIN",
            "sort_order": 1
        },
        {
            "code": "IT",
            "name": "信息科",
            "full_name": "信息技术科",
            "description": "负责医院信息化建设和维护",
            "parent_code": "ADMIN",
            "level": 3,
            "path": "/ROOT/ADMIN/IT",
            "sort_order": 1
        },
        {
            "code": "MEDICAL",
            "name": "医务部",
            "full_name": "医务部",
            "description": "负责医疗业务管理",
            "parent_code": "ROOT",
            "level": 2,
            "path": "/ROOT/MEDICAL",
            "sort_order": 2
        },
        {
            "code": "RADIOLOGY",
            "name": "影像科",
            "full_name": "医学影像科",
            "description": "负责医学影像诊断工作",
            "parent_code": "MEDICAL",
            "level": 3,
            "path": "/ROOT/MEDICAL/RADIOLOGY",
            "sort_order": 1
        },
        {
            "code": "CARDIOLOGY",
            "name": "心内科",
            "full_name": "心血管内科",
            "description": "负责心血管疾病诊疗",
            "parent_code": "MEDICAL",
            "level": 3,
            "path": "/ROOT/MEDICAL/CARDIOLOGY",
            "sort_order": 2
        }
    ]
    
    # 创建部门映射表
    dept_map = {}
    
    for dept_data in departments_data:
        parent_code = dept_data.pop('parent_code', None)
        parent_id = dept_map.get(parent_code) if parent_code else None
        
        department = Department(
            parent_id=parent_id,
            **dept_data
        )
        
        session.add(department)
        session.flush()  # 获取ID
        
        dept_map[dept_data['code']] = department.id
        print(f"   创建部门: {dept_data['name']} (ID: {department.id})")
    
    return dept_map

def init_permissions(session):
    """初始化权限数据"""
    print("🔐 初始化权限数据...")
    
    permissions_data = [
        # 系统管理权限
        {"code": "system.admin", "name": "系统管理", "module": "system", "resource": "system", "action": "admin", "description": "系统管理员权限"},
        {"code": "system.config", "name": "系统配置", "module": "system", "resource": "config", "action": "manage", "description": "系统配置管理"},
        {"code": "system.log", "name": "日志查看", "module": "system", "resource": "log", "action": "read", "description": "系统日志查看"},
        
        # 用户管理权限
        {"code": "user.create", "name": "创建用户", "module": "user", "resource": "user", "action": "create", "description": "创建新用户"},
        {"code": "user.read", "name": "查看用户", "module": "user", "resource": "user", "action": "read", "description": "查看用户信息"},
        {"code": "user.update", "name": "更新用户", "module": "user", "resource": "user", "action": "update", "description": "更新用户信息"},
        {"code": "user.delete", "name": "删除用户", "module": "user", "resource": "user", "action": "delete", "description": "删除用户"},
        
        # 角色管理权限
        {"code": "role.create", "name": "创建角色", "module": "user", "resource": "role", "action": "create", "description": "创建新角色"},
        {"code": "role.read", "name": "查看角色", "module": "user", "resource": "role", "action": "read", "description": "查看角色信息"},
        {"code": "role.update", "name": "更新角色", "module": "user", "resource": "role", "action": "update", "description": "更新角色信息"},
        {"code": "role.delete", "name": "删除角色", "module": "user", "resource": "role", "action": "delete", "description": "删除角色"},
        
        # 患者管理权限
        {"code": "patient.create", "name": "创建患者", "module": "patient", "resource": "patient", "action": "create", "description": "创建患者档案"},
        {"code": "patient.read", "name": "查看患者", "module": "patient", "resource": "patient", "action": "read", "description": "查看患者信息"},
        {"code": "patient.update", "name": "更新患者", "module": "patient", "resource": "patient", "action": "update", "description": "更新患者信息"},
        {"code": "patient.delete", "name": "删除患者", "module": "patient", "resource": "patient", "action": "delete", "description": "删除患者档案"},
        
        # 影像管理权限
        {"code": "image.upload", "name": "上传影像", "module": "image", "resource": "image", "action": "create", "description": "上传医学影像"},
        {"code": "image.read", "name": "查看影像", "module": "image", "resource": "image", "action": "read", "description": "查看医学影像"},
        {"code": "image.update", "name": "更新影像", "module": "image", "resource": "image", "action": "update", "description": "更新影像信息"},
        {"code": "image.delete", "name": "删除影像", "module": "image", "resource": "image", "action": "delete", "description": "删除医学影像"},
        {"code": "image.annotate", "name": "影像标注", "module": "image", "resource": "image", "action": "annotate", "description": "医学影像标注"},
        
        # 诊断报告权限
        {"code": "report.create", "name": "创建报告", "module": "report", "resource": "report", "action": "create", "description": "创建诊断报告"},
        {"code": "report.read", "name": "查看报告", "module": "report", "resource": "report", "action": "read", "description": "查看诊断报告"},
        {"code": "report.update", "name": "更新报告", "module": "report", "resource": "report", "action": "update", "description": "更新诊断报告"},
        {"code": "report.delete", "name": "删除报告", "module": "report", "resource": "report", "action": "delete", "description": "删除诊断报告"},
        {"code": "report.approve", "name": "审核报告", "module": "report", "resource": "report", "action": "approve", "description": "审核诊断报告"},
        {"code": "report.export", "name": "导出报告", "module": "report", "resource": "report", "action": "export", "description": "导出诊断报告"},
        
        # AI模型权限
        {"code": "ai.model.manage", "name": "模型管理", "module": "ai", "resource": "model", "action": "manage", "description": "AI模型管理"},
        {"code": "ai.inference", "name": "AI推理", "module": "ai", "resource": "inference", "action": "execute", "description": "执行AI推理"},
        {"code": "ai.result.read", "name": "查看AI结果", "module": "ai", "resource": "result", "action": "read", "description": "查看AI分析结果"},
    ]
    
    for perm_data in permissions_data:
        permission = Permission(**perm_data)
        session.add(permission)
        print(f"   创建权限: {perm_data['name']} ({perm_data['code']})")
    
    session.flush()

def init_roles(session):
    """初始化角色数据"""
    print("👥 初始化角色数据...")
    
    roles_data = [
        {
            "code": "super_admin",
            "name": "超级管理员",
            "description": "系统超级管理员，拥有所有权限",
            "level": 100,
            "is_system": True,
            "permissions": ["system.admin", "system.config", "system.log", "user.create", "user.read", "user.update", "user.delete", "role.create", "role.read", "role.update", "role.delete"]
        },
        {
            "code": "admin",
            "name": "系统管理员",
            "description": "系统管理员，负责用户和权限管理",
            "level": 90,
            "is_system": True,
            "permissions": ["user.create", "user.read", "user.update", "user.delete", "role.read", "role.update"]
        },
        {
            "code": "doctor",
            "name": "医生",
            "description": "医生角色，可以查看患者信息、影像和报告",
            "level": 50,
            "is_default": True,
            "permissions": ["patient.read", "patient.update", "image.read", "image.annotate", "report.create", "report.read", "report.update", "ai.inference", "ai.result.read"]
        },
        {
            "code": "radiologist",
            "name": "影像科医生",
            "description": "影像科医生，专门负责影像诊断",
            "level": 60,
            "permissions": ["patient.read", "image.read", "image.annotate", "report.create", "report.read", "report.update", "report.approve", "ai.inference", "ai.result.read"]
        },
        {
            "code": "technician",
            "name": "技师",
            "description": "医学技师，负责影像采集和处理",
            "level": 30,
            "permissions": ["patient.read", "image.upload", "image.read", "image.update"]
        },
        {
            "code": "nurse",
            "name": "护士",
            "description": "护士角色，可以查看患者基本信息",
            "level": 20,
            "permissions": ["patient.read", "image.read", "report.read"]
        },
        {
            "code": "viewer",
            "name": "查看者",
            "description": "只读权限，可以查看基本信息",
            "level": 10,
            "permissions": ["patient.read", "image.read", "report.read"]
        }
    ]
    
    # 获取所有权限
    permissions = {p.code: p for p in session.query(Permission).all()}
    
    for role_data in roles_data:
        perm_codes = role_data.pop('permissions', [])
        
        role = Role(**role_data)
        session.add(role)
        session.flush()  # 获取ID
        
        # 分配权限
        for perm_code in perm_codes:
            if perm_code in permissions:
                role.permissions.append(permissions[perm_code])
        
        print(f"   创建角色: {role.name} ({role.code}) - {len(perm_codes)}个权限")
    
    session.flush()

def init_users(session, dept_map):
    """初始化用户数据"""
    print("👤 初始化用户数据...")
    
    # 获取角色
    roles = {r.code: r for r in session.query(Role).all()}
    
    users_data = [
        {
            "username": "admin",
            "email": "admin@xiehe.com",
            "real_name": "系统管理员",
            "password": "admin123",
            "employee_id": "ADMIN001",
            "department_id": dept_map.get("IT"),
            "position": "系统管理员",
            "is_superuser": True,
            "is_verified": True,
            "roles": ["super_admin"]
        },
        {
            "username": "doctor01",
            "email": "doctor01@xiehe.com",
            "real_name": "张医生",
            "password": "doctor123",
            "employee_id": "DOC001",
            "department_id": dept_map.get("CARDIOLOGY"),
            "position": "主治医师",
            "title": "副主任医师",
            "is_verified": True,
            "roles": ["doctor"]
        },
        {
            "username": "radiologist01",
            "email": "radio01@xiehe.com",
            "real_name": "李影像",
            "password": "radio123",
            "employee_id": "RAD001",
            "department_id": dept_map.get("RADIOLOGY"),
            "position": "影像科医生",
            "title": "主治医师",
            "is_verified": True,
            "roles": ["radiologist"]
        },
        {
            "username": "tech01",
            "email": "tech01@xiehe.com",
            "real_name": "王技师",
            "password": "tech123",
            "employee_id": "TECH001",
            "department_id": dept_map.get("RADIOLOGY"),
            "position": "医学技师",
            "is_verified": True,
            "roles": ["technician"]
        }
    ]
    
    for user_data in users_data:
        password = user_data.pop('password')
        role_codes = user_data.pop('roles', [])
        
        # 创建密码哈希
        password_hash, salt = create_password_hash(password)
        user_data['password_hash'] = password_hash
        user_data['salt'] = salt
        
        user = User(**user_data)
        session.add(user)
        session.flush()  # 获取ID
        
        # 分配角色
        for role_code in role_codes:
            if role_code in roles:
                user.roles.append(roles[role_code])
        
        print(f"   创建用户: {user.real_name} ({user.username}) - {len(role_codes)}个角色")
    
    session.flush()

def main():
    """主函数"""
    print("🚀 开始初始化用户权限表...")
    print("=" * 60)
    
    try:
        # 初始化数据库表结构
        engine = init_database()
        
        # 创建会话
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        
        try:
            # 初始化部门数据
            dept_map = init_departments(session)
            
            # 初始化权限数据
            init_permissions(session)
            
            # 初始化角色数据
            init_roles(session)
            
            # 初始化用户数据
            init_users(session, dept_map)
            
            # 提交事务
            session.commit()
            
            print("\n" + "=" * 60)
            print("🎉 用户权限表初始化完成!")
            print("📊 数据统计:")
            print(f"   部门数量: {session.query(Department).count()}")
            print(f"   权限数量: {session.query(Permission).count()}")
            print(f"   角色数量: {session.query(Role).count()}")
            print(f"   用户数量: {session.query(User).count()}")
            
            print("\n👤 默认用户账号:")
            print("   管理员: admin / admin123")
            print("   医生: doctor01 / doctor123")
            print("   影像医生: radiologist01 / radio123")
            print("   技师: tech01 / tech123")
            
            return True
            
        except Exception as e:
            session.rollback()
            print(f"❌ 数据初始化失败: {e}")
            return False
        finally:
            session.close()
            
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
