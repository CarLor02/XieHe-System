import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints.imaging.handlers.files import _build_renamed_filename
from app.api.v1.endpoints.imaging.schemas.files import RenameImageFileRequest


@pytest.mark.parametrize("basename", ["", "   ", "folder/name", r"folder\name"])
def test_rename_request_rejects_invalid_basenames(basename: str) -> None:
    with pytest.raises(ValidationError):
        RenameImageFileRequest(basename=basename)


def test_rename_request_trims_basename() -> None:
    request = RenameImageFileRequest(basename="  new-name  ")

    assert request.basename == "new-name"


def test_renamed_filename_preserves_only_original_extension() -> None:
    assert _build_renamed_filename("original.scan.png", "renamed") == "renamed.png"
    assert _build_renamed_filename("dicom-file", "renamed") == "renamed"


def test_renamed_filename_rejects_full_name_over_database_limit() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _build_renamed_filename("original.png", "a" * 252)

    assert exc_info.value.status_code == 422
