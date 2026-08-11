"""用户身份与个人资料 SQLAlchemy 仓储。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.contexts.access_control.application.dto import UserProfile
from app.contexts.access_control.domain import AuthenticatedIdentity

from .models import Department, User


class SqlAlchemyIdentityRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_active_by_login(self, login: str) -> AuthenticatedIdentity | None:
        user = (
            self._session.query(User)
            .filter(
                or_(User.username == login, User.email == login),
                User.status == "active",
                User.is_deleted.is_(False),
            )
            .first()
        )
        return self._identity(user) if user else None

    def find_active_by_id(self, user_id: int) -> AuthenticatedIdentity | None:
        user = (
            self._session.query(User)
            .filter(
                User.id == user_id,
                User.status == "active",
                User.is_deleted.is_(False),
            )
            .first()
        )
        return self._identity(user) if user else None

    def create_user(
        self,
        *,
        username: str,
        email: str,
        phone: str | None,
        full_name: str,
        password_hash: str,
    ) -> AuthenticatedIdentity:
        user = User(
            username=username,
            email=email,
            phone=phone,
            real_name=full_name,
            password_hash=password_hash,
            salt="",
            status="active",
            is_superuser=False,
            is_system_admin=False,
            system_admin_level=0,
            is_verified=True,
            is_deleted=False,
        )
        self._session.add(user)
        self._session.commit()
        self._session.refresh(user)
        return self._identity(user)

    def update_password(self, user_id: int, password_hash: str) -> bool:
        user = (
            self._session.query(User)
            .filter(User.id == user_id, User.is_deleted.is_(False))
            .first()
        )
        if not user:
            return False
        user.password_hash = password_hash
        user.updated_at = datetime.now()
        self._session.commit()
        return True

    def get_profile(self, user_id: int) -> UserProfile | None:
        user = self._session.query(User).filter(User.id == user_id).first()
        return self._profile(user) if user else None

    def update_profile(
        self, user_id: int, changes: dict[str, Any]
    ) -> UserProfile | None:
        user = self._session.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        for field, value in changes.items():
            setattr(user, field, value)
        self._session.commit()
        self._session.refresh(user)
        return self._profile(user)

    def phone_in_use(self, phone: str, *, excluding_user_id: int) -> bool:
        return (
            self._session.query(User.id)
            .filter(User.phone == phone, User.id != excluding_user_id)
            .first()
            is not None
        )

    def save_avatar(
        self, user_id: int, *, bucket: str, object_key: str, etag: str | None
    ) -> UserProfile | None:
        user = self._session.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.avatar_storage_bucket = bucket
        user.avatar_object_key = object_key
        user.avatar_storage_etag = etag
        user.avatar_deleted_at = None
        self._session.commit()
        self._session.refresh(user)
        return self._profile(user)

    def mark_avatar_deleted(self, user_id: int) -> UserProfile | None:
        user = self._session.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.avatar_deleted_at = datetime.now()
        self._session.commit()
        self._session.refresh(user)
        return self._profile(user)

    def list_users(self) -> list[dict[str, Any]]:
        users = (
            self._session.query(User)
            .filter(or_(User.is_deleted.is_(False), User.is_deleted.is_(None)))
            .order_by(User.created_at.desc())
            .all()
        )
        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email or "",
                "full_name": user.real_name or "",
                "is_active": user.status == "active",
                "created_at": user.created_at.isoformat() if user.created_at else "",
                "updated_at": user.updated_at.isoformat() if user.updated_at else "",
            }
            for user in users
        ]

    @staticmethod
    def _identity(user: User) -> AuthenticatedIdentity:
        is_superuser = bool(user.is_superuser)
        return AuthenticatedIdentity(
            id=user.id,
            username=str(user.username),
            email=str(user.email),
            full_name=str(user.real_name or user.username),
            password_hash=str(user.password_hash),
            is_active=user.status == "active",
            is_superuser=is_superuser,
            is_system_admin=bool(user.is_system_admin),
            system_admin_level=int(user.system_admin_level or 0),
            roles=("admin",) if is_superuser else ("doctor",),
            permissions=(
                ("user_manage", "patient_manage", "system_manage")
                if is_superuser
                else ("patient_manage", "image_manage")
            ),
        )

    def _profile(self, user: User) -> UserProfile:
        department_name = None
        if user.department_id:
            department = (
                self._session.query(Department)
                .filter(Department.id == user.department_id)
                .first()
            )
            department_name = str(department.name) if department else None
        return UserProfile(
            id=user.id,
            username=str(user.username),
            email=str(user.email),
            full_name=str(user.real_name or user.username),
            phone=str(user.phone) if user.phone else None,
            real_name=str(user.real_name) if user.real_name else None,
            employee_id=str(user.employee_id) if user.employee_id else None,
            department=department_name,
            department_id=user.department_id,
            position=str(user.position) if user.position else None,
            title=str(user.title) if user.title else None,
            is_active=user.status == "active",
            is_superuser=bool(user.is_superuser),
            is_system_admin=bool(user.is_system_admin),
            system_admin_level=int(user.system_admin_level or 0),
            avatar_storage_bucket=(
                str(user.avatar_storage_bucket)
                if user.avatar_storage_bucket and not user.avatar_deleted_at
                else None
            ),
            avatar_object_key=(
                str(user.avatar_object_key)
                if user.avatar_object_key and not user.avatar_deleted_at
                else None
            ),
            avatar_url=None,
            avatar_deleted=user.avatar_deleted_at is not None,
            created_at=user.created_at.isoformat() if user.created_at else None,
            updated_at=user.updated_at.isoformat() if user.updated_at else None,
        )
