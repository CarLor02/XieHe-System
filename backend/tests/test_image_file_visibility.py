from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.patient import GenderEnum, Patient, PatientStatusEnum
from app.models.team import Team, TeamMembership, TeamMembershipRole, TeamMembershipStatus
from app.models.user import User
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
    get_visible_image_uploader_ids,
)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        seed_visibility_data(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def seed_visibility_data(session):
    users = [
        User(
            id=user_id,
            username=username,
            email=f"{username}@example.com",
            password_hash="hash",
            salt="salt",
            real_name=username,
            status="active",
        )
        for user_id, username in (
            (10, "admin"),
            (11, "member"),
            (12, "inactive"),
            (13, "outside"),
        )
    ]
    patient = Patient(
        id=100,
        patient_id="P100",
        name="测试患者",
        gender=GenderEnum.MALE,
        status=PatientStatusEnum.ACTIVE,
    )
    team = Team(id=1, name="脊柱团队", creator_id=10)
    memberships = [
        TeamMembership(
            team_id=1,
            user_id=10,
            role=TeamMembershipRole.ADMIN,
            status=TeamMembershipStatus.ACTIVE,
        ),
        TeamMembership(
            team_id=1,
            user_id=11,
            role=TeamMembershipRole.MEMBER,
            status=TeamMembershipStatus.ACTIVE,
        ),
        TeamMembership(
            team_id=1,
            user_id=12,
            role=TeamMembershipRole.MEMBER,
            status=TeamMembershipStatus.INACTIVE,
        ),
    ]
    images = [
        make_image(1, "admin.png", 10),
        make_image(2, "member.png", 11),
        make_image(3, "inactive.png", 12),
        make_image(4, "outside.png", 13),
        make_image(5, "deleted.png", 11, is_deleted=True),
    ]

    session.add_all(users + [patient, team] + memberships + images)
    session.commit()


def make_image(
    image_id: int,
    filename: str,
    uploader_id: int,
    *,
    is_deleted: bool = False,
) -> ImageFile:
    return ImageFile(
        id=image_id,
        file_uuid=f"image-{image_id}",
        original_filename=filename,
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_path=f"completed/{filename}",
        file_size=1024,
        uploaded_by=uploader_id,
        patient_id=100,
        status=ImageFileStatusEnum.UPLOADED,
        upload_progress=100,
        uploaded_at=datetime(2026, 1, image_id),
        is_deleted=is_deleted,
    )


def current_user(user_id: int, *, superuser: bool = False) -> dict:
    return {"id": user_id, "is_superuser": superuser}


def visible_patient_image_ids(session, user: dict) -> list[int]:
    query = session.query(ImageFile).filter(
        ImageFile.patient_id == 100,
        ImageFile.is_deleted == False,
    )
    return [
        image.id
        for image in apply_image_visibility_filter(query, session, user)
        .order_by(ImageFile.id)
        .all()
    ]


def test_regular_member_only_sees_own_uploaded_images(db_session):
    assert get_visible_image_uploader_ids(db_session, current_user(11)) == [11]
    assert visible_patient_image_ids(db_session, current_user(11)) == [2]
    assert get_visible_image_file(db_session, 1, current_user(11)) is None


def test_team_admin_sees_active_team_member_images(db_session):
    assert get_visible_image_uploader_ids(db_session, current_user(10)) == [10, 11]
    assert visible_patient_image_ids(db_session, current_user(10)) == [1, 2]
    assert get_visible_image_file(db_session, 2, current_user(10)).id == 2


def test_non_team_member_cannot_see_other_uploaders(db_session):
    assert visible_patient_image_ids(db_session, current_user(13)) == [4]
    assert get_visible_image_file(db_session, 2, current_user(13)) is None


def test_superuser_can_see_all_non_deleted_images(db_session):
    assert get_visible_image_uploader_ids(
        db_session,
        current_user(99, superuser=True),
    ) is None
    assert visible_patient_image_ids(db_session, current_user(99, superuser=True)) == [
        1,
        2,
        3,
        4,
    ]
    assert get_visible_image_file(db_session, 5, current_user(99, superuser=True)) is None
