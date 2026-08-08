from datetime import datetime
from typing import Any, cast

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.v1.endpoints.system.handlers import dashboard as dashboard_handlers
from app.contexts.imaging.application import ImageVisibilityApplicationService
from app.contexts.imaging.application.dto import ImageListFilters
from app.contexts.imaging.infrastructure.persistence import (
    ImageAnnotationRevision,
    SqlAlchemyImageQueryRepository,
    SqlAlchemyImageVisibilityRepository,
    apply_image_access_scope,
)
from app.contexts.imaging.interface.http.v1.actor import image_access_actor
from app.contexts.imaging.interface.http.v1.dependencies import (
    get_image_file_command_service,
    get_image_selection_service,
)
from app.contexts.imaging.interface.http.v1.routes.mutations import (
    batch_update_exam_type,
    delete_image_file,
    rename_image_file,
    replace_image_file_content,
)
from app.contexts.imaging.interface.http.v1.routes.selectors import (
    list_assignable_image_teams,
    list_visible_image_uploaders,
)
from app.contexts.imaging.interface.http.v1.schemas import (
    BatchUpdateExamTypeRequest,
    RenameImageFileRequest,
)
from app.contexts.patients.infrastructure.persistence.models import (
    GenderEnum,
    Patient,
    PatientStatusEnum,
)
from app.models.image_file import (
    ImageFile,
    ImageFileStatusEnum,
    ImageFileTeamVisibility,
    ImageFileTypeEnum,
)
from app.models.team import (
    Team,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)
from app.models.user import User
from app.shared.storage import storage_service_client

pytestmark = pytest.mark.database


def response_data(response: dict[str, object]) -> dict[str, Any]:
    return cast(dict[str, Any], response["data"])


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
            (99, "system-admin"),
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

    entities: list[object] = [*users, patient, team, *memberships, *images]
    session.add_all(entities)
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


def visibility_service(session: Session) -> ImageVisibilityApplicationService:
    return ImageVisibilityApplicationService(
        SqlAlchemyImageVisibilityRepository(session)
    )


def get_visible_image_file(
    session: Session,
    image_id: int,
    user: dict,
) -> ImageFile | None:
    return visibility_service(session).get_visible_image(
        image_id,
        image_access_actor(user),
    )


def get_visible_image_uploader_ids(
    session: Session,
    user: dict,
) -> list[int] | None:
    return visibility_service(session).list_visible_uploader_ids(
        image_access_actor(user)
    )


def visible_patient_image_ids(session, user: dict) -> list[int]:
    query = session.query(ImageFile).filter(
        ImageFile.patient_id == 100,
        ImageFile.is_deleted.is_(False),
    )
    scope = visibility_service(session).resolve_scope(image_access_actor(user))
    return [
        image.id
        for image in apply_image_access_scope(query, scope).order_by(ImageFile.id).all()
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
    image = get_visible_image_file(db_session, 2, current_user(10))
    assert image is not None
    assert image.id == 2


def test_non_team_member_cannot_see_other_uploaders(db_session):
    assert visible_patient_image_ids(db_session, current_user(13)) == [4]
    assert get_visible_image_file(db_session, 2, current_user(13)) is None


def test_inactive_team_does_not_grant_admin_visibility(db_session):
    db_session.add_all(
        [
            TeamMembership(
                team_id=4,
                user_id=10,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            ),
            ImageFileTeamVisibility(image_file_id=4, team_id=4),
        ]
    )
    db_session.commit()

    assert get_visible_image_file(db_session, 4, current_user(10)) is None


def test_active_member_can_assign_joined_team_only(db_session):
    service = visibility_service(db_session)

    assert service.validate_assignable_team_ids(
        image_access_actor(current_user(11)),
        [1],
    ) == [1]
    with pytest.raises(PermissionError):
        service.validate_assignable_team_ids(
            image_access_actor(current_user(11)),
            [2],
        )


def test_system_admin_can_assign_any_active_team(db_session):
    service = visibility_service(db_session)
    actor = image_access_actor(current_user(99, system_admin=True))

    assert service.validate_assignable_team_ids(actor, [2, 1]) == [1, 2]
    with pytest.raises(PermissionError):
        service.validate_assignable_team_ids(actor, [4])


def test_superuser_can_see_all_non_deleted_images(db_session):
    assert (
        get_visible_image_uploader_ids(
            db_session,
            current_user(99, superuser=True),
        )
        is None
    )
    assert visible_patient_image_ids(db_session, current_user(99, superuser=True)) == [
        1,
        2,
        3,
        4,
    ]
    assert (
        get_visible_image_file(db_session, 5, current_user(99, superuser=True)) is None
    )


def test_system_admin_can_see_all_non_deleted_images(db_session):
    assert (
        get_visible_image_uploader_ids(
            db_session,
            current_user(99, system_admin=True),
        )
        is None
    )
    assert visible_patient_image_ids(
        db_session,
        current_user(99, system_admin=True),
    ) == [1, 2, 3, 4]


@pytest.mark.asyncio
async def test_team_admin_lists_visible_team_uploaders(db_session):
    assign_image_to_team(db_session, 2)

    result = list_visible_image_uploaders(
        page=1,
        page_size=10,
        search=None,
        current_user=current_user(10),
        service=get_image_selection_service(db_session),
    )

    data = response_data(result)
    items = data["items"]

    assert [item["id"] for item in items] == [10, 11]
    assert [item["real_name"] for item in items] == ["admin", "member"]
    assert data["pagination"]["total"] == 2


@pytest.mark.asyncio
async def test_regular_member_cannot_list_uploaders(db_session):
    with pytest.raises(HTTPException) as exc_info:
        list_visible_image_uploaders(
            page=1,
            page_size=10,
            search=None,
            current_user=current_user(11),
            service=get_image_selection_service(db_session),
        )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_counts_only_explicit_team_images(db_session):
    before = await dashboard_handlers.get_dashboard_stats(
        current_user=current_user(10),
        db=db_session,
    )
    assert before["data"]["total_images"] == 1

    assign_image_to_team(db_session, 2)
    after = await dashboard_handlers.get_dashboard_stats(
        current_user=current_user(10),
        db=db_session,
    )
    assert after["data"]["total_images"] == 2


@pytest.mark.asyncio
async def test_dashboard_recent_images_respect_visibility(db_session):
    result = await dashboard_handlers.get_recent_activities(
        limit=6,
        current_user=current_user(10),
        db=db_session,
    )
    image_activities = [
        item for item in result["data"]["activities"] if item["type"] == "image"
    ]

    assert [item["id"] for item in image_activities] == [1]


@pytest.mark.asyncio
async def test_assignable_teams_are_paginated_and_scoped_to_user_memberships(
    db_session,
):
    result = list_assignable_image_teams(
        page=1,
        page_size=1,
        search=None,
        current_user=current_user(10),
        service=get_image_selection_service(db_session),
    )

    data = response_data(result)
    items = data["items"]

    assert [item["id"] for item in items] == [3]
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["total_pages"] == 2


@pytest.mark.asyncio
async def test_system_admin_can_page_all_active_assignable_teams(db_session):
    result = list_assignable_image_teams(
        page=1,
        page_size=10,
        search="团队",
        current_user=current_user(99, system_admin=True),
        service=get_image_selection_service(db_session),
    )

    data = response_data(result)
    items = data["items"]

    assert [item["id"] for item in items] == [3, 2, 1]
    assert data["pagination"]["total"] == 3


def query_image_list(
    db_session: Session,
    *,
    user: dict,
    uploaded_by: int,
) -> list:
    result = SqlAlchemyImageQueryRepository(db_session).list_images(
        scope=ImageVisibilityApplicationService(
            SqlAlchemyImageVisibilityRepository(db_session)
        ).resolve_scope(image_access_actor(user)),
        page=1,
        page_size=20,
        filters=ImageListFilters(uploaded_by=uploaded_by),
    )
    return result.items


def test_image_list_filters_by_visible_uploader(db_session):
    assign_image_to_team(db_session, 2)

    items = query_image_list(
        db_session,
        user=current_user(10),
        uploaded_by=11,
    )

    assert [item.id for item in items] == [2]
    assert items[0].uploaded_by == 11


def test_image_list_includes_team_names(db_session):
    assign_image_to_team(db_session, 2, 1)
    assign_image_to_team(db_session, 2, 3)

    items = query_image_list(
        db_session,
        user=current_user(10),
        uploaded_by=11,
    )

    assert items[0].team_ids == [1, 3]
    assert items[0].team_names == ["脊柱团队", "影像团队"]


def test_personal_image_list_returns_empty_team_names(db_session):
    items = query_image_list(
        db_session,
        user=current_user(10),
        uploaded_by=10,
    )

    assert items[0].team_ids == []
    assert items[0].team_names == []


@pytest.mark.asyncio
async def test_team_admin_can_delete_visible_team_member_image(db_session):
    assign_image_to_team(db_session, 2)

    result = delete_image_file(
        2,
        current_user=current_user(10),
        service=get_image_file_command_service(db_session),
    )

    assert result["data"] == {"file_id": 2}
    assert db_session.get(ImageFile, 2).is_deleted is True
    assert db_session.get(ImageFile, 2).deleted_by == 10


@pytest.mark.asyncio
async def test_regular_member_cannot_delete_other_uploader_image(db_session):
    with pytest.raises(HTTPException) as exc_info:
        delete_image_file(
            1,
            current_user=current_user(11),
            service=get_image_file_command_service(db_session),
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

    monkeypatch.setattr(storage_service_client, "put_object", fake_put_object)

    result = await replace_image_file_content(
        2,
        file=FakeUploadFile(content=b"team-admin-edited"),
        description=None,
        team_ids=None,
        current_user=current_user(10),
        service=get_image_file_command_service(db_session),
    )

    data = response_data(result)
    assert data["id"] == 2
    assert data["storage_etag"] == "team-admin-etag"
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

    monkeypatch.setattr(storage_service_client, "put_object", fake_put_object)

    result = await replace_image_file_content(
        4,
        file=FakeUploadFile(content=b"system-admin-edited"),
        description=None,
        team_ids=None,
        current_user=current_user(99, system_admin=True),
        service=get_image_file_command_service(db_session),
    )

    data = response_data(result)
    assert data["id"] == 4
    assert data["storage_etag"] == "system-admin-etag"
    assert db_session.get(ImageFile, 4).file_size == len(b"system-admin-edited")


@pytest.mark.asyncio
async def test_owner_can_rename_image_without_changing_storage_or_annotations(
    db_session,
):
    image = db_session.get(ImageFile, 1)
    image.annotation = {"measurements": [{"id": "m1"}]}
    original_object_key = image.object_key
    db_session.commit()

    result = rename_image_file(
        1,
        request=RenameImageFileRequest(basename="  renamed-image  "),
        current_user=current_user(10),
        service=get_image_file_command_service(db_session),
    )

    renamed_image = db_session.get(ImageFile, 1)
    assert response_data(result)["original_filename"] == "renamed-image.png"
    assert renamed_image.original_filename == "renamed-image.png"
    assert renamed_image.object_key == original_object_key
    assert renamed_image.annotation == {"measurements": [{"id": "m1"}]}


@pytest.mark.asyncio
async def test_team_admin_can_rename_visible_team_member_image(db_session):
    assign_image_to_team(db_session, 2)

    result = rename_image_file(
        2,
        request=RenameImageFileRequest(basename="team-image"),
        current_user=current_user(10),
        service=get_image_file_command_service(db_session),
    )

    assert response_data(result)["original_filename"] == "team-image.png"
    assert db_session.get(ImageFile, 2).original_filename == "team-image.png"


@pytest.mark.asyncio
async def test_regular_member_cannot_rename_other_uploader_image(db_session):
    with pytest.raises(HTTPException) as exc_info:
        rename_image_file(
            1,
            request=RenameImageFileRequest(basename="forbidden"),
            current_user=current_user(11),
            service=get_image_file_command_service(db_session),
        )

    assert exc_info.value.status_code == 404
    assert db_session.get(ImageFile, 1).original_filename == "admin.png"


@pytest.mark.asyncio
async def test_system_admin_can_rename_any_image(db_session):
    result = rename_image_file(
        4,
        request=RenameImageFileRequest(basename="system-renamed"),
        current_user=current_user(99, system_admin=True),
        service=get_image_file_command_service(db_session),
    )

    assert response_data(result)["original_filename"] == "system-renamed.png"


def test_batch_exam_type_update_clears_changed_annotations_and_skips_same_type(
    db_session: Session,
) -> None:
    assign_image_to_team(db_session, 2)
    changed_image = db_session.get(ImageFile, 1)
    unchanged_image = db_session.get(ImageFile, 2)
    assert changed_image is not None
    assert unchanged_image is not None
    changed_image.description = "侧位X光片"
    changed_image.annotation = {"measurements": [{"id": "changed-measurement"}]}
    changed_image.has_annotation = True
    changed_image.status = ImageFileStatusEnum.PROCESSED
    unchanged_image.description = "正位X光片"
    unchanged_image.annotation = {"measurements": [{"id": "kept-measurement"}]}
    unchanged_image.has_annotation = True
    unchanged_image.status = ImageFileStatusEnum.PROCESSED
    db_session.commit()

    result = batch_update_exam_type(
        request=BatchUpdateExamTypeRequest(
            ids=[2, 1, 1],
            exam_type="正位X光片",
        ),
        current_user=current_user(10),
        service=get_image_file_command_service(db_session),
    )

    assert response_data(result) == {
        "updated_ids": [1],
        "unchanged_ids": [2],
        "updated_count": 1,
        "unchanged_count": 1,
        "exam_type": "正位X光片",
    }
    db_session.expire_all()
    changed_image = db_session.get(ImageFile, 1)
    unchanged_image = db_session.get(ImageFile, 2)
    assert changed_image is not None
    assert unchanged_image is not None
    assert changed_image.description == "正位X光片"
    assert changed_image.annotation["measurements"] == []
    assert changed_image.annotation["vertebraeLayer"] == []
    assert changed_image.has_annotation is False
    assert changed_image.status == ImageFileStatusEnum.UPLOADED
    assert unchanged_image.annotation == {"measurements": [{"id": "kept-measurement"}]}
    assert unchanged_image.status == ImageFileStatusEnum.PROCESSED

    revision = (
        db_session.query(ImageAnnotationRevision)
        .filter(ImageAnnotationRevision.image_file_id == 1)
        .one()
    )
    assert revision.reason == "EXAM_TYPE_CHANGE"
    assert revision.source == "SYSTEM"


def test_batch_exam_type_update_rolls_back_when_any_image_is_not_visible(
    db_session: Session,
) -> None:
    image = db_session.get(ImageFile, 1)
    assert image is not None
    image.description = "侧位X光片"
    image.annotation = {"measurements": [{"id": "must-remain"}]}
    image.has_annotation = True
    image.status = ImageFileStatusEnum.PROCESSED
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        batch_update_exam_type(
            request=BatchUpdateExamTypeRequest(
                ids=[1, 2],
                exam_type="正位X光片",
            ),
            current_user=current_user(10),
            service=get_image_file_command_service(db_session),
        )

    assert exc_info.value.status_code == 404
    db_session.expire_all()
    image = db_session.get(ImageFile, 1)
    assert image is not None
    assert image.description == "侧位X光片"
    assert image.annotation == {"measurements": [{"id": "must-remain"}]}
    assert image.status == ImageFileStatusEnum.PROCESSED
    assert (
        db_session.query(ImageAnnotationRevision)
        .filter(ImageAnnotationRevision.image_file_id == 1)
        .count()
        == 0
    )
