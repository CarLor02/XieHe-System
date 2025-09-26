"""
邮件发送服务

提供邮件发送、模板管理和批量发送功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging
from jinja2 import Template, Environment, FileSystemLoader
import aiofiles
import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailTemplate:
    """邮件模板类"""
    
    def __init__(self, name: str, subject: str, html_content: str, text_content: Optional[str] = None):
        self.name = name
        self.subject = subject
        self.html_content = html_content
        self.text_content = text_content or self._html_to_text(html_content)
        self.html_template = Template(html_content)
        self.text_template = Template(self.text_content)
        self.subject_template = Template(subject)
    
    def _html_to_text(self, html: str) -> str:
        """简单的HTML到文本转换"""
        import re
        # 移除HTML标签
        text = re.sub(r'<[^>]+>', '', html)
        # 清理多余空白
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def render(self, context: Dict[str, Any]) -> Dict[str, str]:
        """渲染模板"""
        return {
            'subject': self.subject_template.render(**context),
            'html': self.html_template.render(**context),
            'text': self.text_template.render(**context)
        }


class EmailService:
    """邮件服务类"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'localhost')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.smtp_use_tls = getattr(settings, 'SMTP_USE_TLS', True)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@xiehe-medical.com')
        self.from_name = getattr(settings, 'FROM_NAME', '协和医疗影像诊断系统')
        
        # 模板存储
        self.templates: Dict[str, EmailTemplate] = {}
        self._load_default_templates()
    
    def _load_default_templates(self):
        """加载默认邮件模板"""
        
        # 系统通知模板
        system_notification_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{{ title }}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9fafb; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{{ title }}</h1>
                </div>
                <div class="content">
                    <p>{{ message }}</p>
                    {% if action_url %}
                    <p><a href="{{ action_url }}" class="button">{{ action_text or '查看详情' }}</a></p>
                    {% endif %}
                </div>
                <div class="footer">
                    <p>协和医疗影像诊断系统</p>
                    <p>此邮件由系统自动发送，请勿回复</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self.templates['system_notification'] = EmailTemplate(
            name='system_notification',
            subject='{{ title }}',
            html_content=system_notification_html
        )
        
        # 用户注册欢迎邮件
        welcome_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>欢迎使用协和医疗影像诊断系统</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #10b981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9fafb; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>欢迎加入协和医疗</h1>
                </div>
                <div class="content">
                    <p>亲爱的 {{ username }}，</p>
                    <p>欢迎您使用协和医疗影像诊断系统！您的账户已成功创建。</p>
                    <p>您可以使用以下信息登录系统：</p>
                    <ul>
                        <li>用户名：{{ username }}</li>
                        <li>邮箱：{{ email }}</li>
                    </ul>
                    <p><a href="{{ login_url }}" class="button">立即登录</a></p>
                    <p>如有任何问题，请联系我们的技术支持团队。</p>
                </div>
                <div class="footer">
                    <p>协和医疗影像诊断系统</p>
                    <p>此邮件由系统自动发送，请勿回复</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self.templates['welcome'] = EmailTemplate(
            name='welcome',
            subject='欢迎使用协和医疗影像诊断系统',
            html_content=welcome_html
        )
        
        # 密码重置邮件
        password_reset_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>密码重置</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9fafb; }
                .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
                .button { display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; }
                .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 5px; color: #991b1b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>密码重置请求</h1>
                </div>
                <div class="content">
                    <p>您好 {{ username }}，</p>
                    <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
                    <p><a href="{{ reset_url }}" class="button">重置密码</a></p>
                    <div class="warning">
                        <p><strong>安全提醒：</strong></p>
                        <ul>
                            <li>此链接将在 {{ expires_in }} 小时后失效</li>
                            <li>如果您没有请求重置密码，请忽略此邮件</li>
                            <li>请勿将此链接分享给他人</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>协和医疗影像诊断系统</p>
                    <p>此邮件由系统自动发送，请勿回复</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self.templates['password_reset'] = EmailTemplate(
            name='password_reset',
            subject='密码重置请求 - 协和医疗影像诊断系统',
            html_content=password_reset_html
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        to_name: Optional[str] = None
    ) -> bool:
        """发送单个邮件"""
        try:
            # 创建邮件消息
            message = MIMEMultipart('alternative')
            message['From'] = f"{self.from_name} <{self.from_email}>"
            message['To'] = f"{to_name} <{to_email}>" if to_name else to_email
            message['Subject'] = subject
            
            # 添加文本内容
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                message.attach(text_part)
            
            # 添加HTML内容
            html_part = MIMEText(html_content, 'html', 'utf-8')
            message.attach(html_part)
            
            # 添加附件
            if attachments:
                for file_path in attachments:
                    await self._add_attachment(message, file_path)
            
            # 发送邮件
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.smtp_username,
                password=self.smtp_password,
                use_tls=self.smtp_use_tls
            )
            
            logger.info(f"邮件发送成功: {to_email} - {subject}")
            return True
            
        except Exception as e:
            logger.error(f"邮件发送失败: {to_email} - {subject} - {e}")
            return False
    
    async def send_template_email(
        self,
        to_email: str,
        template_name: str,
        context: Dict[str, Any],
        to_name: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """使用模板发送邮件"""
        if template_name not in self.templates:
            logger.error(f"邮件模板不存在: {template_name}")
            return False
        
        template = self.templates[template_name]
        rendered = template.render(context)
        
        return await self.send_email(
            to_email=to_email,
            subject=rendered['subject'],
            html_content=rendered['html'],
            text_content=rendered['text'],
            attachments=attachments,
            to_name=to_name
        )
    
    async def send_batch_emails(
        self,
        emails: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> Dict[str, Any]:
        """批量发送邮件"""
        semaphore = asyncio.Semaphore(max_concurrent)
        results = {'success': 0, 'failed': 0, 'errors': []}
        
        async def send_single_email(email_data):
            async with semaphore:
                try:
                    if 'template_name' in email_data:
                        success = await self.send_template_email(**email_data)
                    else:
                        success = await self.send_email(**email_data)
                    
                    if success:
                        results['success'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"发送失败: {email_data.get('to_email', 'unknown')}")
                        
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"发送异常: {email_data.get('to_email', 'unknown')} - {str(e)}")
        
        # 并发发送邮件
        tasks = [send_single_email(email_data) for email_data in emails]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info(f"批量邮件发送完成: 成功 {results['success']}, 失败 {results['failed']}")
        return results
    
    async def _add_attachment(self, message: MIMEMultipart, file_path: str):
        """添加邮件附件"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.warning(f"附件文件不存在: {file_path}")
                return
            
            async with aiofiles.open(file_path, 'rb') as f:
                attachment_data = await f.read()
            
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment_data)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {file_path.name}'
            )
            message.attach(part)
            
        except Exception as e:
            logger.error(f"添加附件失败: {file_path} - {e}")
    
    def add_template(self, template: EmailTemplate):
        """添加邮件模板"""
        self.templates[template.name] = template
        logger.info(f"邮件模板已添加: {template.name}")
    
    def get_template(self, name: str) -> Optional[EmailTemplate]:
        """获取邮件模板"""
        return self.templates.get(name)
    
    def list_templates(self) -> List[str]:
        """列出所有模板名称"""
        return list(self.templates.keys())
    
    async def test_connection(self) -> bool:
        """测试SMTP连接"""
        try:
            async with aiosmtplib.SMTP(
                hostname=self.smtp_server,
                port=self.smtp_port,
                use_tls=self.smtp_use_tls
            ) as smtp:
                if self.smtp_username and self.smtp_password:
                    await smtp.login(self.smtp_username, self.smtp_password)
                
                logger.info("SMTP连接测试成功")
                return True
                
        except Exception as e:
            logger.error(f"SMTP连接测试失败: {e}")
            return False


# 创建全局邮件服务实例
email_service = EmailService()


# 便捷函数
async def send_welcome_email(username: str, email: str, login_url: str) -> bool:
    """发送欢迎邮件"""
    return await email_service.send_template_email(
        to_email=email,
        template_name='welcome',
        context={
            'username': username,
            'email': email,
            'login_url': login_url
        },
        to_name=username
    )


async def send_password_reset_email(username: str, email: str, reset_url: str, expires_in: int = 24) -> bool:
    """发送密码重置邮件"""
    return await email_service.send_template_email(
        to_email=email,
        template_name='password_reset',
        context={
            'username': username,
            'reset_url': reset_url,
            'expires_in': expires_in
        },
        to_name=username
    )


async def send_system_notification(
    email: str, 
    title: str, 
    message: str, 
    action_url: Optional[str] = None,
    action_text: Optional[str] = None,
    to_name: Optional[str] = None
) -> bool:
    """发送系统通知邮件"""
    return await email_service.send_template_email(
        to_email=email,
        template_name='system_notification',
        context={
            'title': title,
            'message': message,
            'action_url': action_url,
            'action_text': action_text
        },
        to_name=to_name
    )
