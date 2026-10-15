import pytest

from app.contexts.imaging.interface.cli.export_labelme_dataset import parse_args


def test_excel_mode_keeps_default_exam_type() -> None:
    args = parse_args(["--input", "input.xlsx", "--output", "output"])
    assert args.exam_type == "侧位X光片"
    assert not args.all_team_images


def test_team_mode_does_not_filter_exam_type() -> None:
    args = parse_args(
        [
            "--all-team-images",
            "--team-name",
            "团队",
            "--output",
            "output",
        ]
    )
    assert args.exam_type is None
    assert args.input is None


@pytest.mark.parametrize(
    "selection",
    [
        [],
        ["--all-team-images"],
        ["--all-team-images", "--team-name", "团队", "--input", "input.xlsx"],
        ["--all-team-images", "--team-name", "团队", "--exam-type", "侧位X光片"],
    ],
)
def test_invalid_selection_is_rejected(selection: list[str]) -> None:
    with pytest.raises(SystemExit) as exc:
        parse_args([*selection, "--output", "output"])
    assert exc.value.code == 2
