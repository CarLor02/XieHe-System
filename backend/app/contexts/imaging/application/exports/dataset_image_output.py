"""Atomic image and LabelMe file output for offline dataset exports."""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

from app.contexts.imaging.application.dto import DatasetExportCandidate
from app.contexts.imaging.application.ports import ObjectStorage
from app.contexts.imaging.domain import JsonObject
from app.contexts.imaging.domain.exports import build_labelme_document

_INVALID_FILENAME = re.compile(r'[\\/:*?"<>|]')


@dataclass(frozen=True, slots=True)
class DatasetImageOutputPaths:
    relative_png: Path
    png: Path
    labelme_json: Path


class DatasetImageOutputWriter:
    def __init__(self, storage: ObjectStorage) -> None:
        self._storage = storage

    @staticmethod
    def paths_for(
        candidate: DatasetExportCandidate,
        output_directory: Path,
    ) -> DatasetImageOutputPaths:
        patient = _safe_component(candidate.patient_identifier or "")
        image_stem = _safe_component(Path(candidate.original_filename).stem)
        relative_png = Path(patient) / f"{image_stem}.png"
        png_path = output_directory / relative_png
        return DatasetImageOutputPaths(
            relative_png=relative_png,
            png=png_path,
            labelme_json=png_path.with_suffix(".json"),
        )

    async def write(
        self,
        *,
        candidate: DatasetExportCandidate,
        annotation: JsonObject | None,
        paths: DatasetImageOutputPaths,
        overwrite: bool,
    ) -> None:
        paths.png.parent.mkdir(parents=True, exist_ok=True)
        if not overwrite and (paths.png.exists() or paths.labelme_json.exists()):
            raise FileExistsError("输出文件已存在；使用 --overwrite 允许覆盖")

        width, height = await self._download_png(candidate, paths.png)
        labelme = build_labelme_document(
            image_path=paths.png.name,
            annotation=annotation,
            target_width=width,
            target_height=height,
        )
        write_json_atomic(paths.labelme_json, labelme)

    async def _download_png(
        self,
        candidate: DatasetExportCandidate,
        output_path: Path,
    ) -> tuple[int, int]:
        source_fd, source_name = tempfile.mkstemp(
            prefix=f".{output_path.stem}-",
            suffix=".source.part",
            dir=output_path.parent,
        )
        os.close(source_fd)
        png_fd, png_name = tempfile.mkstemp(
            prefix=f".{output_path.stem}-",
            suffix=".png.part",
            dir=output_path.parent,
        )
        os.close(png_fd)
        source_path = Path(source_name)
        png_temp_path = Path(png_name)
        try:
            with source_path.open("w+b") as destination:
                await self._storage.download_object_to(
                    bucket=candidate.storage_bucket,
                    object_key=candidate.object_key,
                    destination=destination,
                )
                destination.flush()
            actual_size = source_path.stat().st_size
            if actual_size != candidate.file_size:
                raise OSError(
                    f"下载大小不一致: expected={candidate.file_size}, "
                    f"actual={actual_size}"
                )
            width, height = await asyncio.to_thread(
                _prepare_png,
                source_path,
                png_temp_path,
            )
            os.replace(png_temp_path, output_path)
            return width, height
        finally:
            source_path.unlink(missing_ok=True)
            png_temp_path.unlink(missing_ok=True)


def write_json_atomic(output_path: Path, payload: object) -> None:
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{output_path.stem}-",
        suffix=".json.part",
        dir=output_path.parent,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(temporary_path, output_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def _safe_component(value: str) -> str:
    sanitized = _INVALID_FILENAME.sub("_", value).strip().strip(".")
    return sanitized or "unknown"


def _prepare_png(source_path: Path, destination_path: Path) -> tuple[int, int]:
    with Image.open(source_path) as opened:
        source_format = (opened.format or "").upper()
        width, height = opened.size
        if source_format == "PNG":
            opened.verify()
            shutil.copyfile(source_path, destination_path)
            return width, height

    with Image.open(source_path) as opened:
        if (opened.format or "").upper() == "TIFF":
            opened.seek(0)
        image = ImageOps.exif_transpose(opened)
        image.load()
        image.save(destination_path, format="PNG")
        return image.width, image.height
