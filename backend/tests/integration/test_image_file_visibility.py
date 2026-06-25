from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.v1.endpoints.imaging.handlers import files as file_handlers
from app.models.image_file import (
    ImageFile,
    ImageFileStatusEnum,
    ImageFileTeamVisibility,
    ImageFileTypeEnum,
)
from app.models.patient import GenderEnum, Patient, PatientStatusEnum
from app.models.team import Team, TeamMembership, TeamMembershipRole, TeamMembershipStatus
from app.models.user import User
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
    get_visible_image_uploader_ids,
)


pytestmark = pytest.mark.database


@pytest.fixture(autouse=True)
def seed_visibility_fixture(db_session: Session) -> None:
    seed_visibility_data(db_session)


def seed_visibility_data(session: Session) -> None:
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
    session.add_all(
        [
            Team(id=2, name="康复团队", creator_id=13),
            Team(id=3, name="影像团队", creator_id=10),
            Team(id=4, name="停用团队", creator_id=10, is_active=False),
            TeamMembership(
                team_id=2,
                user_id=13,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            ),
            TeamMembership(
                team_id=3,
                user_id=10,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            ),
        ]
    )
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
        storage_bucket="medical-image-files",
        object_key=filename,
        file_size=1024,
        uploaded_by=uploader_id,
        patient_id=100,
        status=ImageFileStatusEnum.UPLOADED,
        upload_progress=100,
        uploaded_at=datetime(2026, 1, image_id),
        is_deleted=is_deleted,
    )


class FakeUploadFile:
    def __init__(
        self,
        *,
        filename: str = "edited.png",
        content_type: str = "image/png",
        content: bytes = b"edited-image",
    ) -> None:
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self) -> bytes:
        return self._content


def current_user(
    user_id: int,
    *,
    superuser: bool = False,
    system_admin: bool = False,
) -> dict:
    return {
        "id": user_id,
        "username": f"user-{user_id}",
        "is_superuser": superuser,
        "is_system_admin": system_admin,
    }


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


def assign_image_to_team(session: Session, image_id: int, team_id: int = 1) -> None:
    session.add(ImageFileTeamVisibility(image_file_id=image_id, team_id=team_id))
    session.commit()


def test_regular_member_only_sees_own_uploaded_images(db_session):
    assert get_visible_image_uploader_ids(db_session, current_user(11)) == [11]
    assert visible_patient_image_ids(db_session, current_user(11)) == [2]
    assert get_visible_image_file(db_session, 1, current_user(11)) is None


def test_team_admin_does_not_see_unassigned_member_personal_images(db_session):
    assert visible_patient_image_ids(db_session, current_user(10)) == [1]
    assert get_visible_image_file(db_session, 2, current_user(10)) is None


def test_team_admin_sees_team_owned_member_images(db_session):
    assign_image_to_team(db_session, 2)

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


def test_system_admin_can_see_all_non_deleted_images(db_session):
    assert get_visible_image_uploader_ids(
        db_session,
        current_user(99, system_admin=True),
    ) is None
    assert visible_patient_image_ids(
        db_session,
        current_user(99, system_admin=True),
    ) == [1, 2, 3, 4]


@pytest.mark.asyncio
async def test_team_admin_lists_visible_team_uploaders(db_session):
    assign_image_to_team(db_session, 2)

    result = await file_handlers.list_visible_image_uploaders(
        page=1,
        page_size=10,
        search=None,
        current_user=current_user(10),
        db=db_session,
    )

    items = result["data"]["items"]

    assert [item["id"] for item in items] == [10, 11]
    assert [item["real_name"] for item in items] == ["admin", "member"]
    assert result["data"]["pagination"]["total"] == 2


@pytest.mark.asyncio
async def test_regular_member_cannot_list_uploaders(db_session):
    with pytest.raises(HTTPException) as exc_info:
        await file_handlers.list_visible_image_uploaders(
            page=1,
            page_size=10,
            search=None,
            current_user=current_user(11),
            db=db_session,
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_assignable_teams_are_paginated_and_scoped_to_user_memberships(db_session):
    result = await file_handlers.list_assignable_image_teams(
        page=1,
        page_size=1,
        search=None,
        current_user=current_user(10),
        db=db_session,
    )

    items = result["data"]["items"]

    assert [item["id"] for item in items] == [3]
    assert result["data"]["pagination"]["total"] == 2
    assert result["data"]["pagination"]["total_pages"] == 2


@pytest.mark.asyncio
async def test_system_admin_can_page_all_active_assignable_teams(db_session):
    result = await file_handlers.list_assignable_image_teams(
        page=1,
        page_size=10,
        search="团队",
        current_user=current_user(99, system_admin=True),
        db=db_session,
    )

    items = result["data"]["items"]

    assert [item["id"] for item in items] == [3, 2, 1]
    assert result["data"]["pagination"]["total"] == 3


@pytest.mark.asyncio
async def test_image_list_filters_by_visible_uploader(db_session):
    assign_image_to_team(db_session, 2)

    result = await file_handlers.get_image_files_list(
        page=1,
        page_size=20,
        file_type=None,
        file_status=None,
        status=None,
        pending_only=None,
        review_status=None,
        description=None,
        start_date=None,
        end_date=None,
        search=None,
        uploaded_by=11,
        team_ids=None,
        current_user=current_user(10),
        db=db_session,
    )

    items = result["data"]["items"]

    assert [item["id"] for item in items] == [2]
    assert items[0]["uploaded_by"] == 11


@pytest.mark.asyncio
async def test_team_admin_can_delete_visible_team_member_image(db_session):
    assign_image_to_team(db_session, 2)

    result = await file_handlers.delete_image_file(
        2,
        current_user=current_user(10),
        db=db_session,
    )

    assert result["data"] == {"file_id": 2}
    assert db_session.get(ImageFile, 2).is_deleted is True
    assert db_session.get(ImageFile, 2).deleted_by == 10


@pytest.mark.asyncio
async def test_regular_member_cannot_delete_other_uploader_image(db_session):
    with pytest.raises(HTTPException) as exc_info:
        await file_handlers.delete_image_file(
            1,
            current_user=current_user(11),
            db=db_session,
        )

    assert exc_info.value.status_code == 403
    assert db_session.get(ImageFile, 1).is_deleted is False


@pytest.mark.asyncio
async def test_team_admin_can_replace_visible_team_member_image(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
):
    assign_image_to_team(db_session, 2)

    put_calls: list[dict[str, object]] = []

    async def fake_put_object(
        *,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> dict[str, str]:
        put_calls.append(
            {
                "bucket": bucket,
                "object_key": object_key,
                "data": data,
                "content_type": content_type,
            }
        )
        return {"etag": "team-admin-etag"}

    monkeypatch.setattr(file_handlers.storage_gateway, "put_object", fake_put_object)

    result = await file_handlers.replace_image_file_content(
        2,
        file=FakeUploadFile(content=b"team-admin-edited"),
        current_user=current_user(10),
        db=db_session,
    )

    assert result["data"]["id"] == 2
    assert result["data"]["storage_etag"] == "team-admin-etag"
    assert db_session.get(ImageFile, 2).file_size == len(b"team-admin-edited")
    assert put_calls[0]["object_key"] == "member.png"


@pytest.mark.asyncio
async def test_system_admin_can_replace_any_image(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
):
    async def fake_put_object(
        *,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> dict[str, str]:
        return {"etag": "system-admin-etag"}

    monkeypatch.setattr(file_handlers.storage_gateway, "put_object", fake_put_object)

    result = await file_handlers.replace_image_file_content(
        4,
        file=FakeUploadFile(content=b"system-admin-edited"),
        current_user=current_user(99, system_admin=True),
        db=db_session,
    )

    assert result["data"]["id"] == 4
    assert result["data"]["storage_etag"] == "system-admin-etag"
    assert db_session.get(ImageFile, 4).file_size == len(b"system-admin-edited")
