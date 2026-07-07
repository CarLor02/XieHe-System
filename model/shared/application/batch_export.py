from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}


def iter_images(input_dir: Path, recursive: bool) -> list[Path]:
    pattern = "**/*" if recursive else "*"
    return sorted(
        path
        for path in input_dir.glob(pattern)
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def write_raw(raw_dir: Path | None, image_path: Path, result: dict[str, Any]) -> None:
    if raw_dir is None:
        return
    raw_dir.mkdir(parents=True, exist_ok=True)
    target = raw_dir / f"{image_path.stem}.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


def empty_metric_row(
    image_path: Path,
    metrics: Iterable[Any],
    display_names: dict[Any, str],
) -> dict[str, str]:
    row = {"id": image_path.stem}
    row.update({display_names[metric]: "" for metric in metrics})
    return row


def write_excel(
    output_path: Path,
    rows: list[dict[str, str]],
    errors: list[dict[str, str]],
) -> None:
    import pandas as pd

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        pd.DataFrame(rows).to_excel(writer, sheet_name="measurements", index=False)
        if errors:
            pd.DataFrame(errors).to_excel(writer, sheet_name="errors", index=False)
