"""
安全认证模块

提供JWT令牌生成、验证、刷新机制，密码加密等安全功能。
支持访问令牌和刷新令牌的完整生命周期管理。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import jwt
from jwt import PyJWTError as JWTError
import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from passlib.context import CryptContext
from passlib.hash import bcrypt as passlib_bcrypt

from .config import settings
from .cache import get_cache_manager

import logging
logger = logging.getLogger(__name__)

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


class SecurityManager:
    """安全管理器"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = ALGORITHM
        self.cache_manager = None
    
    def get_cache_manager(self):
        """获取缓存管理器"""
        if self.cache_manager is None:
            self.cache_manager = get_cache_manager()
        return self.cache_manager
    
    # ==========================================
    # 密码相关功能
    # ==========================================
    
    def hash_password(self, password: str) -> str:
        """
        加密密码

        Args:
            password: 明文密码

        Returns:
            str: 加密后的密码哈希

        Note:
            为了避免 bcrypt 的 72 字节限制，先对密码进行 SHA256 哈希
        """
        import hashlib
        import base64

        # 先用 SHA256 哈希密码，避免 bcrypt 的 72 字节限制
        password_bytes = password.encode('utf-8')
        sha256_hash = hashlib.sha256(password_bytes).digest()
        # 使用 base64 编码使其成为可打印字符串
        password_b64 = base64.b64encode(sha256_hash).decode('utf-8')

        return pwd_context.hash(password_b64)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        验证密码

        Args:
            plain_password: 明文密码
            hashed_password: 加密后的密码哈希

        Returns:
            bool: 密码是否正确
        """
        import hashlib
        import base64

        # 先用 SHA256 哈希密码，与 hash_password 保持一致
        password_bytes = plain_password.encode('utf-8')
        sha256_hash = hashlib.sha256(password_bytes).digest()
        password_b64 = base64.b64encode(sha256_hash).decode('utf-8')

        return pwd_context.verify(password_b64, hashed_password)
    
    def generate_random_password(self, length: int = 12) -> str:
        """
        生成随机密码
        
        Args:
            length: 密码长度
        
        Returns:
            str: 随机密码
        """
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    # ==========================================
    # JWT令牌功能
    # ==========================================
    
    def create_access_token(self, data: Dict[str, Any], 
                          expires_delta: Optional[timedelta] = None) -> str:
        """
        创建访问令牌
        
        Args:
            data: 要编码的数据
            expires_delta: 过期时间增量
        
        Returns:
            str: JWT访问令牌
        """
        to_encode = data.copy()
        
        # 设置过期时间
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        })
        
        # 生成JWT令牌
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        logger.debug(f"创建访问令牌成功，用户: {data.get('sub')}, 过期时间: {expire}")
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any],
                           expires_delta: Optional[timedelta] = None) -> str:
        """
        创建刷新令牌
        
        Args:
            data: 要编码的数据
            expires_delta: 过期时间增量
        
        Returns:
            str: JWT刷新令牌
        """
        to_encode = data.copy()
        
        # 设置过期时间
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        # 添加随机标识符，确保刷新令牌唯一性
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh",
            "jti": secrets.token_urlsafe(32)  # JWT ID
        })
        
        # 生成JWT令牌
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        # 将刷新令牌存储到缓存中（用于撤销检查）
        cache_key = f"refresh_token:{to_encode['jti']}"
        cache_manager = self.get_cache_manager()
        cache_manager.set(cache_key, {
            "user_id": data.get("sub"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expire.isoformat()
        }, ttl=int(expires_delta.total_seconds()) if expires_delta else REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)
        
        logger.debug(f"创建刷新令牌成功，用户: {data.get('sub')}, 过期时间: {expire}")
        return encoded_jwt
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        验证JWT令牌
        
        Args:
            token: JWT令牌
            token_type: 令牌类型 ("access" 或 "refresh")
        
        Returns:
            Optional[Dict[str, Any]]: 解码后的令牌数据，验证失败返回None
        """
        try:
            # 解码JWT令牌
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # 检查令牌类型
            if payload.get("type") != token_type:
                logger.warning(f"令牌类型不匹配，期望: {token_type}, 实际: {payload.get('type')}")
                return None
            
            # 检查是否在黑名单中
            if self.is_token_blacklisted(token):
                logger.warning("令牌已被加入黑名单")
                return None
            
            # 如果是刷新令牌，检查是否在缓存中
            if token_type == "refresh":
                jti = payload.get("jti")
                if jti:
                    cache_key = f"refresh_token:{jti}"
                    cache_manager = self.get_cache_manager()
                    cached_token = cache_manager.get(cache_key)
                    if not cached_token:
                        logger.warning("刷新令牌不在有效缓存中")
                        return None
            
            logger.debug(f"令牌验证成功，用户: {payload.get('sub')}, 类型: {token_type}")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("令牌已过期")
            return None
        except JWTError as e:
            logger.warning(f"令牌验证失败: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        使用刷新令牌获取新的访问令牌
        
        Args:
            refresh_token: 刷新令牌
        
        Returns:
            Optional[Dict[str, str]]: 包含新访问令牌的字典，失败返回None
        """
        # 验证刷新令牌
        payload = self.verify_token(refresh_token, "refresh")
        if not payload:
            return None
        
        # 创建新的访问令牌
        user_data = {
            "sub": payload.get("sub"),
            "username": payload.get("username"),
            "user_id": payload.get("user_id"),
            "roles": payload.get("roles", [])
        }
        
        new_access_token = self.create_access_token(user_data)
        
        logger.info(f"刷新访问令牌成功，用户: {payload.get('sub')}")
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    
    def revoke_refresh_token(self, refresh_token: str) -> bool:
        """
        撤销刷新令牌
        
        Args:
            refresh_token: 要撤销的刷新令牌
        
        Returns:
            bool: 是否撤销成功
        """
        try:
            # 解码令牌获取JTI
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=[self.algorithm])
            jti = payload.get("jti")
            
            if jti:
                # 从缓存中删除刷新令牌
                cache_key = f"refresh_token:{jti}"
                cache_manager = self.get_cache_manager()
                result = cache_manager.delete(cache_key)
                
                logger.info(f"撤销刷新令牌成功，JTI: {jti}")
                return result > 0
            
            return False
            
        except jwt.JWTError as e:
            logger.error(f"撤销刷新令牌失败: {e}")
            return False
    
    def blacklist_token(self, token: str, ttl: Optional[int] = None) -> bool:
        """
        将令牌加入黑名单
        
        Args:
            token: 要加入黑名单的令牌
            ttl: 黑名单过期时间（秒）
        
        Returns:
            bool: 是否加入成功
        """
        try:
            # 解码令牌获取过期时间
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            exp = payload.get("exp")
            
            if exp:
                # 计算剩余时间
                expire_time = datetime.fromtimestamp(exp, tz=timezone.utc)
                remaining_time = expire_time - datetime.now(timezone.utc)
                
                if remaining_time.total_seconds() > 0:
                    # 将令牌加入黑名单
                    cache_key = f"blacklist_token:{token}"
                    cache_manager = self.get_cache_manager()
                    cache_ttl = ttl or int(remaining_time.total_seconds())
                    
                    result = cache_manager.set(cache_key, {
                        "blacklisted_at": datetime.now(timezone.utc).isoformat(),
                        "user_id": payload.get("sub")
                    }, ttl=cache_ttl)
                    
                    logger.info(f"令牌已加入黑名单，用户: {payload.get('sub')}")
                    return result
            
            return False
            
        except jwt.JWTError as e:
            logger.error(f"加入黑名单失败: {e}")
            return False
    
    def is_token_blacklisted(self, token: str) -> bool:
        """
        检查令牌是否在黑名单中
        
        Args:
            token: 要检查的令牌
        
        Returns:
            bool: 是否在黑名单中
        """
        try:
            cache_key = f"blacklist_token:{token}"
            cache_manager = self.get_cache_manager()
            return cache_manager.exists(cache_key)
        except Exception as e:
            logger.error(f"检查黑名单失败: {e}")
            return False
    
    def generate_api_key(self, user_id: str, name: str = "default") -> str:
        """
        生成API密钥
        
        Args:
            user_id: 用户ID
            name: API密钥名称
        
        Returns:
            str: API密钥
        """
        # 生成随机API密钥
        api_key = f"xh_{secrets.token_urlsafe(32)}"
        
        # 存储API密钥信息
        cache_key = f"api_key:{api_key}"
        cache_manager = self.get_cache_manager()
        cache_manager.set(cache_key, {
            "user_id": user_id,
            "name": name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used": None
        }, ttl=365 * 24 * 3600)  # 1年过期
        
        logger.info(f"生成API密钥成功，用户: {user_id}, 名称: {name}")
        return api_key
    
    def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        验证API密钥
        
        Args:
            api_key: API密钥
        
        Returns:
            Optional[Dict[str, Any]]: API密钥信息，验证失败返回None
        """
        try:
            cache_key = f"api_key:{api_key}"
            cache_manager = self.get_cache_manager()
            api_info = cache_manager.get(cache_key)
            
            if api_info:
                # 更新最后使用时间
                api_info["last_used"] = datetime.now(timezone.utc).isoformat()
                cache_manager.set(cache_key, api_info, ttl=365 * 24 * 3600)
                
                logger.debug(f"API密钥验证成功，用户: {api_info.get('user_id')}")
                return api_info
            
            return None
            
        except Exception as e:
            logger.error(f"API密钥验证失败: {e}")
            return None


# 全局安全管理器实例
security_manager = SecurityManager()


# 便捷函数
def hash_password(password: str) -> str:
    """加密密码"""
    return security_manager.hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return security_manager.verify_password(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    return security_manager.create_access_token(data, expires_delta)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """创建刷新令牌"""
    return security_manager.create_refresh_token(data, expires_delta)


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """验证令牌"""
    return security_manager.verify_token(token, token_type)


# 导出
__all__ = [
    "SecurityManager", "security_manager", 
    "hash_password", "verify_password",
    "create_access_token", "create_refresh_token", "verify_token"
]
