#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from measurement_pipeline import (
    ApMeasurementMetric,
    METRIC_DISPLAY_NAMES,
    build_measurement_excel_row,
)


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}


def parse_metrics(raw: str | None) -> list[ApMeasurementMetric]:
    if not raw:
        return list(ApMeasurementMetric)
    return [ApMeasurementMetric(item.strip()) for item in raw.split(",") if item.strip()]


def iter_images(input_dir: Path, recursive: bool) -> list[Path]:
    pattern = "**/*" if recursive else "*"
    return sorted(
        path
        for path in input_dir.glob(pattern)
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def write_raw(raw_dir: Path | None, image_path: Path, result: dict) -> None:
    if raw_dir is None:
        return
    raw_dir.mkdir(parents=True, exist_ok=True)
    target = raw_dir / f"{image_path.stem}.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="批量导出正位 AI 测量指标")
    parser.add_argument("--input-dir", required=True, type=Path, help="待测量图片目录")
    parser.add_argument("--metrics", help="逗号分隔的指标 enum，例如 cobb1,t1-tilt,ca")
    parser.add_argument("--output", required=True, type=Path, help="输出 Excel 路径")
    parser.add_argument("--recursive", action="store_true", help="递归读取子目录图片")
    parser.add_argument("--raw-output-dir", type=Path, help="可选：保存每张图片的原始 JSON")
    args = parser.parse_args()

    metrics = parse_metrics(args.metrics)
    images = iter_images(args.input_dir, args.recursive)
    if not images:
        raise SystemExit(f"未找到图片: {args.input_dir}")

    import pandas as pd
    from app import decode_image, load_models, measurement_image

    load_models()
    rows: list[dict[str, str]] = []
    errors: list[dict[str, str]] = []

    for image_path in images:
        try:
            image = decode_image(image_path.read_bytes())
            result = measurement_image(image, image_path.stem)
            write_raw(args.raw_output_dir, image_path, result)
            rows.append(
                build_measurement_excel_row(
                    image_path.name,
                    result.get("measurements", []),
                    metrics,
                )
            )
        except Exception as exc:  # noqa: BLE001 - internal batch script should keep going.
            row = {"id": image_path.stem}
            row.update({METRIC_DISPLAY_NAMES[metric]: "" for metric in metrics})
            rows.append(row)
            errors.append({"id": image_path.stem, "file": str(image_path), "error": str(exc)})

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(args.output, engine="openpyxl") as writer:
        pd.DataFrame(rows).to_excel(writer, sheet_name="measurements", index=False)
        if errors:
            pd.DataFrame(errors).to_excel(writer, sheet_name="errors", index=False)

    print(f"已导出 {len(rows)} 张图片的测量结果: {args.output}")
    if errors:
        print(f"其中 {len(errors)} 张图片失败，见 errors sheet")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
