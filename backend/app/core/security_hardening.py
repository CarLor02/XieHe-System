"""
安全性加固模块

提供数据加密、SQL注入防护、XSS防护、CSRF防护等安全功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import hashlib
import secrets
import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import bleach
import re
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import ipaddress
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

# 安全配置
ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
ALLOWED_HTML_ATTRIBUTES = {}
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 3600  # 1小时


class DataEncryption:
    """数据加密类"""
    
    def __init__(self, password: str = None):
        if password is None:
            password = settings.SECRET_KEY
        
        # 生成密钥
        password_bytes = password.encode()
        salt = b'salt_1234567890'  # 在生产环境中应该使用随机salt
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """加密数据"""
        try:
            encrypted_data = self.cipher.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"数据加密失败: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """解密数据"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.cipher.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"数据解密失败: {e}")
            raise
    
    def hash_password(self, password: str) -> str:
        """
        密码哈希 - 使用 bcrypt

        Returns:
            str: bcrypt 哈希值（格式：$2b$12$...）
        """
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """
        验证密码 - 使用 bcrypt

        Args:
            password: 明文密码
            hashed_password: bcrypt 哈希值

        Returns:
            bool: 密码是否正确
        """
        try:
            import bcrypt
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False


class SQLInjectionProtection:
    """SQL注入防护类"""
    
    @staticmethod
    def sanitize_input(input_value: str) -> str:
        """清理输入，防止SQL注入"""
        if not isinstance(input_value, str):
            return str(input_value)
        
        # 移除危险字符
        dangerous_patterns = [
            r"[';\"\\]",  # 引号和反斜杠
            r"--",        # SQL注释
            r"/\*.*?\*/", # 多行注释
            r"\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b",  # SQL关键字
        ]
        
        cleaned_input = input_value
        for pattern in dangerous_patterns:
            cleaned_input = re.sub(pattern, "", cleaned_input, flags=re.IGNORECASE)
        
        return cleaned_input.strip()
    
    @staticmethod
    def validate_sql_query(query: str) -> bool:
        """验证SQL查询安全性"""
        query_lower = query.lower().strip()
        
        # 检查是否包含危险操作
        dangerous_operations = [
            'drop table', 'drop database', 'truncate', 'delete from',
            'update ', 'insert into', 'create ', 'alter ', 'grant ', 'revoke '
        ]
        
        for operation in dangerous_operations:
            if operation in query_lower:
                logger.warning(f"检测到危险SQL操作: {operation}")
                return False
        
        return True
    
    @staticmethod
    def execute_safe_query(db: Session, query: str, params: Dict[str, Any] = None) -> Any:
        """安全执行SQL查询"""
        if not SQLInjectionProtection.validate_sql_query(query):
            raise HTTPException(status_code=400, detail="不安全的SQL查询")
        
        try:
            if params:
                # 使用参数化查询
                return db.execute(text(query), params)
            else:
                return db.execute(text(query))
        except Exception as e:
            logger.error(f"SQL查询执行失败: {e}")
            raise HTTPException(status_code=500, detail="查询执行失败")


class XSSProtection:
    """XSS防护类"""
    
    @staticmethod
    def sanitize_html(html_content: str) -> str:
        """清理HTML内容，防止XSS攻击"""
        if not html_content:
            return ""
        
        # 使用bleach库清理HTML
        cleaned_html = bleach.clean(
            html_content,
            tags=ALLOWED_HTML_TAGS,
            attributes=ALLOWED_HTML_ATTRIBUTES,
            strip=True
        )
        
        return cleaned_html
    
    @staticmethod
    def escape_javascript(js_content: str) -> str:
        """转义JavaScript内容"""
        if not js_content:
            return ""
        
        # 转义危险字符
        escape_map = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;',
            '/': '&#x2F;'
        }
        
        escaped_content = js_content
        for char, escape in escape_map.items():
            escaped_content = escaped_content.replace(char, escape)
        
        return escaped_content
    
    @staticmethod
    def validate_input(input_data: Union[str, Dict, List]) -> Union[str, Dict, List]:
        """验证和清理输入数据"""
        if isinstance(input_data, str):
            return XSSProtection.sanitize_html(input_data)
        elif isinstance(input_data, dict):
            return {key: XSSProtection.validate_input(value) for key, value in input_data.items()}
        elif isinstance(input_data, list):
            return [XSSProtection.validate_input(item) for item in input_data]
        else:
            return input_data


class CSRFProtection:
    """CSRF防护类"""
    
    def __init__(self):
        self.tokens: Dict[str, datetime] = {}
        self.token_expiry = timedelta(hours=1)
    
    def generate_token(self, session_id: str) -> str:
        """生成CSRF令牌"""
        token = secrets.token_urlsafe(32)
        self.tokens[token] = datetime.now()
        return token
    
    def validate_token(self, token: str) -> bool:
        """验证CSRF令牌"""
        if token not in self.tokens:
            return False
        
        # 检查令牌是否过期
        if datetime.now() - self.tokens[token] > self.token_expiry:
            del self.tokens[token]
            return False
        
        return True
    
    def cleanup_expired_tokens(self):
        """清理过期令牌"""
        current_time = datetime.now()
        expired_tokens = [
            token for token, created_time in self.tokens.items()
            if current_time - created_time > self.token_expiry
        ]
        
        for token in expired_tokens:
            del self.tokens[token]


class APISecurityMiddleware:
    """API安全中间件"""
    
    def __init__(self):
        self.rate_limiter: Dict[str, List[datetime]] = {}
        self.blocked_ips: set = set()
        self.allowed_ips: set = set()
        
        # 加载IP白名单
        if hasattr(settings, 'ALLOWED_IPS'):
            self.allowed_ips = set(settings.ALLOWED_IPS)
    
    def check_rate_limit(self, client_ip: str) -> bool:
        """检查请求频率限制"""
        current_time = datetime.now()
        
        # 初始化IP记录
        if client_ip not in self.rate_limiter:
            self.rate_limiter[client_ip] = []
        
        # 清理过期记录
        self.rate_limiter[client_ip] = [
            request_time for request_time in self.rate_limiter[client_ip]
            if current_time - request_time < timedelta(seconds=RATE_LIMIT_WINDOW)
        ]
        
        # 检查请求数量
        if len(self.rate_limiter[client_ip]) >= RATE_LIMIT_REQUESTS:
            logger.warning(f"IP {client_ip} 超过请求频率限制")
            return False
        
        # 记录当前请求
        self.rate_limiter[client_ip].append(current_time)
        return True
    
    def check_ip_whitelist(self, client_ip: str) -> bool:
        """检查IP白名单"""
        if not self.allowed_ips:
            return True  # 如果没有设置白名单，允许所有IP
        
        try:
            client_addr = ipaddress.ip_address(client_ip)
            for allowed_ip in self.allowed_ips:
                if '/' in allowed_ip:  # CIDR格式
                    if client_addr in ipaddress.ip_network(allowed_ip):
                        return True
                else:  # 单个IP
                    if client_addr == ipaddress.ip_address(allowed_ip):
                        return True
            return False
        except ValueError:
            logger.error(f"无效的IP地址: {client_ip}")
            return False
    
    def is_blocked(self, client_ip: str) -> bool:
        """检查IP是否被阻止"""
        return client_ip in self.blocked_ips
    
    def block_ip(self, client_ip: str):
        """阻止IP"""
        self.blocked_ips.add(client_ip)
        logger.warning(f"IP {client_ip} 已被阻止")
    
    def unblock_ip(self, client_ip: str):
        """解除IP阻止"""
        self.blocked_ips.discard(client_ip)
        logger.info(f"IP {client_ip} 已解除阻止")


class FileUploadSecurity:
    """文件上传安全类"""
    
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.dcm'}
    DANGEROUS_EXTENSIONS = {'.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    
    @staticmethod
    def validate_file_extension(filename: str) -> bool:
        """验证文件扩展名"""
        if not filename:
            return False
        
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        extension = f'.{extension}'
        
        # 检查是否为危险扩展名
        if extension in FileUploadSecurity.DANGEROUS_EXTENSIONS:
            logger.warning(f"检测到危险文件扩展名: {extension}")
            return False
        
        # 检查是否为允许的扩展名
        if extension not in FileUploadSecurity.ALLOWED_EXTENSIONS:
            logger.warning(f"不允许的文件扩展名: {extension}")
            return False
        
        return True
    
    @staticmethod
    def validate_file_size(file_size: int) -> bool:
        """验证文件大小"""
        if file_size > FileUploadSecurity.MAX_FILE_SIZE:
            logger.warning(f"文件大小超过限制: {file_size} bytes")
            return False
        return True
    
    @staticmethod
    def scan_file_content(file_content: bytes) -> bool:
        """扫描文件内容"""
        # 检查文件头，防止文件类型伪装
        dangerous_signatures = [
            b'\x4d\x5a',  # PE executable
            b'\x50\x4b\x03\x04',  # ZIP (可能包含恶意文件)
        ]
        
        for signature in dangerous_signatures:
            if file_content.startswith(signature):
                logger.warning("检测到可疑文件签名")
                return False
        
        return True


# 创建全局实例
data_encryption = DataEncryption()
csrf_protection = CSRFProtection()
api_security = APISecurityMiddleware()


# 依赖注入函数
def get_current_user_secure(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """安全的用户认证依赖"""
    # 这里应该实现JWT令牌验证
    # 暂时返回模拟用户
    return {"user_id": 1, "username": "secure_user"}


def validate_request_security(request: Request):
    """验证请求安全性"""
    client_ip = request.client.host
    
    # 检查IP是否被阻止
    if api_security.is_blocked(client_ip):
        raise HTTPException(status_code=403, detail="IP已被阻止")
    
    # 检查IP白名单
    if not api_security.check_ip_whitelist(client_ip):
        raise HTTPException(status_code=403, detail="IP不在白名单中")
    
    # 检查请求频率限制
    if not api_security.check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="请求过于频繁")
    
    return True


# 安全工具函数
def generate_secure_filename(original_filename: str) -> str:
    """生成安全的文件名"""
    # 移除路径分隔符和特殊字符
    safe_filename = re.sub(r'[^\w\-_\.]', '', original_filename)
    
    # 添加时间戳避免冲突
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = safe_filename.rsplit('.', 1) if '.' in safe_filename else (safe_filename, '')
    
    return f"{name}_{timestamp}.{ext}" if ext else f"{name}_{timestamp}"


def log_security_event(event_type: str, details: Dict[str, Any], request: Request = None):
    """记录安全事件"""
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        "details": details
    }
    
    if request:
        log_data.update({
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "endpoint": str(request.url)
        })
    
    logger.warning(f"安全事件: {log_data}")


# 安全测试函数
def run_security_tests() -> Dict[str, Any]:
    """运行安全测试"""
    results = {
        "encryption_test": False,
        "xss_protection_test": False,
        "sql_injection_test": False,
        "file_upload_test": False
    }
    
    try:
        # 测试加密功能
        test_data = "敏感数据测试"
        encrypted = data_encryption.encrypt(test_data)
        decrypted = data_encryption.decrypt(encrypted)
        results["encryption_test"] = (decrypted == test_data)
        
        # 测试XSS防护
        xss_input = "<script>alert('xss')</script>正常内容"
        cleaned = XSSProtection.sanitize_html(xss_input)
        results["xss_protection_test"] = "<script>" not in cleaned
        
        # 测试SQL注入防护
        sql_input = "'; DROP TABLE users; --"
        cleaned_sql = SQLInjectionProtection.sanitize_input(sql_input)
        results["sql_injection_test"] = "DROP TABLE" not in cleaned_sql.upper()
        
        # 测试文件上传安全
        results["file_upload_test"] = (
            FileUploadSecurity.validate_file_extension("test.jpg") and
            not FileUploadSecurity.validate_file_extension("malware.exe")
        )
        
    except Exception as e:
        logger.error(f"安全测试失败: {e}")
    
    return results
