#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

MODEL_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(MODEL_ROOT))

from lat.application.measurement_service import load_measurement_models, measure_image
from lat.domain.measurement_pipeline import (
    LatMeasurementMetric,
    METRIC_DISPLAY_NAMES,
    build_measurement_excel_row,
)
from shared.application.batch_export import empty_metric_row, iter_images, write_excel, write_raw
from shared.image_transforms import maybe_lr_flip
from shared.infrastructure.image_io import decode_image_bytes


def parse_metrics(raw: str | None) -> list[LatMeasurementMetric]:
    if not raw:
        return list(LatMeasurementMetric)
    return [LatMeasurementMetric(item.strip()) for item in raw.split(",") if item.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description="批量导出侧位 AI 测量指标")
    parser.add_argument("--input-dir", required=True, type=Path, help="待测量图片目录")
    parser.add_argument("--metrics", help="逗号分隔的指标 enum，例如 t1-slope,pi,pt,ss")
    parser.add_argument("--output", required=True, type=Path, help="输出 Excel 路径")
    parser.add_argument("--recursive", action="store_true", help="递归读取子目录图片")
    parser.add_argument("--raw-output-dir", type=Path, help="可选：保存每张图片的原始 JSON")
    parser.add_argument(
        "--lr_flip",
        "--lr-flip",
        dest="lr_flip",
        action="store_true",
        help="推理前先对图片进行左右翻转",
    )
    args = parser.parse_args()

    metrics = parse_metrics(args.metrics)
    images = iter_images(args.input_dir, args.recursive)
    if not images:
        raise SystemExit(f"未找到图片: {args.input_dir}")

    load_measurement_models()
    rows: list[dict[str, str]] = []
    errors: list[dict[str, str]] = []

    for image_path in images:
        try:
            image = maybe_lr_flip(decode_image_bytes(image_path.read_bytes()), args.lr_flip)
            result = measure_image(image, image_path.stem)
            write_raw(args.raw_output_dir, image_path, result)
            rows.append(
                build_measurement_excel_row(
                    image_path.name,
                    result.get("measurements", []),
                    metrics,
                )
            )
        except Exception as exc:  # noqa: BLE001 - internal batch script should keep going.
            rows.append(empty_metric_row(image_path, metrics, METRIC_DISPLAY_NAMES))
            errors.append({"id": image_path.stem, "file": str(image_path), "error": str(exc)})

    write_excel(args.output, rows, errors)
    print(f"已导出 {len(rows)} 张图片的测量结果: {args.output}")
    if errors:
        print(f"其中 {len(errors)} 张图片失败，见 errors sheet")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
