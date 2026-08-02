import pytest
from pydantic import ValidationError

from app.contexts.imaging.domain import build_renamed_filename
from app.contexts.imaging.interface.http.v1.schemas import RenameImageFileRequest


@pytest.mark.parametrize("basename", ["", "   ", "folder/name", r"folder\name"])
def test_rename_request_rejects_invalid_basenames(basename: str) -> None:
    with pytest.raises(ValidationError):
        RenameImageFileRequest(basename=basename)


def test_rename_request_trims_basename() -> None:
    request = RenameImageFileRequest(basename="  new-name  ")

    assert request.basename == "new-name"


def test_renamed_filename_preserves_only_original_extension() -> None:
    assert build_renamed_filename("original.scan.png", "renamed") == "renamed.png"
    assert build_renamed_filename("dicom-file", "renamed") == "renamed"


def test_renamed_filename_rejects_full_name_over_database_limit() -> None:
    with pytest.raises(ValueError, match="过长"):
        build_renamed_filename("original.png", "a" * 252)
