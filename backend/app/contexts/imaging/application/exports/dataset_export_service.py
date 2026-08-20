"""Filename-driven export of persisted lateral annotations and measurements."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from pathlib import Path

from app.contexts.imaging.application.dto import (
    DatasetExportCandidate,
    DatasetExportItemResult,
    DatasetExportRunResult,
    DatasetExportSummary,
)
from app.contexts.imaging.application.errors import (
    ObjectStorageObjectNotFoundError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.application.ports import (
    DatasetExportRepository,
    ObjectStorage,
)
from app.contexts.imaging.domain.exports import (
    count_annotation_keypoints,
    extract_measurement_values,
)

from .dataset_export_workbook import DatasetExportWorkbook
from .dataset_image_output import DatasetImageOutputWriter, write_json_atomic


class DatasetExportService:
    def __init__(
        self,
        repository: DatasetExportRepository,
        storage: ObjectStorage,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._image_output = DatasetImageOutputWriter(storage)

    async def run(
        self,
        *,
        input_workbook: Path,
        output_directory: Path,
        exam_type: str,
        overwrite: bool,
        query_batch_size: int = 200,
        on_progress: Callable[[int, int, DatasetExportItemResult], None] | None = None,
    ) -> DatasetExportRunResult:
        workbook = DatasetExportWorkbook.load(input_workbook)
        requested_rows = workbook.requested_rows()
        candidates_by_name = self._load_candidates(
            [filename for _row, filename in requested_rows],
            exam_type=exam_type,
            query_batch_size=query_batch_size,
        )
        output_directory.mkdir(parents=True, exist_ok=True)
        results: list[DatasetExportItemResult] = []

        for index, (row_number, filename) in enumerate(requested_rows, start=1):
            workbook.clear_measurements(row_number)
            result = await self._export_row(
                row_number=row_number,
                filename=filename,
                candidates=candidates_by_name.get(filename, []),
                workbook=workbook,
                output_directory=output_directory,
                overwrite=overwrite,
            )
            results.append(result)
            if on_progress is not None:
                on_progress(index, len(requested_rows), result)

        workbook.write_manifest(results)
        summary = self._summarize(results)
        workbook.save_atomic(output_directory / "measurements.xlsx")
        write_json_atomic(
            output_directory / "export-summary.json",
            {
                "requested": summary.requested,
                "succeeded": summary.succeeded,
                "empty_annotations": summary.empty_annotations,
                "not_found": summary.not_found,
                "duplicate_overwrites": summary.duplicate_overwrites,
                "object_missing": summary.object_missing,
                "failed": summary.failed,
            },
        )
        return DatasetExportRunResult(summary=summary, items=tuple(results))

    def _load_candidates(
        self,
        filenames: list[str],
        *,
        exam_type: str,
        query_batch_size: int,
    ) -> dict[str, list[DatasetExportCandidate]]:
        unique_names = list(dict.fromkeys(filenames))
        grouped: dict[str, list[DatasetExportCandidate]] = defaultdict(list)
        for offset in range(0, len(unique_names), query_batch_size):
            batch = unique_names[offset : offset + query_batch_size]
            for candidate in self._repository.find_candidates(
                filenames=batch,
                exam_type=exam_type,
            ):
                grouped[candidate.original_filename].append(candidate)
        for candidates in grouped.values():
            candidates.sort(key=lambda item: item.image_file_id, reverse=True)
        return dict(grouped)

    async def _export_row(
        self,
        *,
        row_number: int,
        filename: str,
        candidates: list[DatasetExportCandidate],
        workbook: DatasetExportWorkbook,
        output_directory: Path,
        overwrite: bool,
    ) -> DatasetExportItemResult:
        selected, selection_status, selection_detail = await self._select_candidate(
            candidates
        )
        if selected is None:
            return DatasetExportItemResult(
                row_number=row_number,
                requested_filename=filename,
                image_file_id=None,
                patient_identifier=None,
                candidate_count=len(candidates),
                candidate_ids=tuple(item.image_file_id for item in candidates),
                exam_type=None,
                output_path=None,
                keypoint_count=0,
                measurement_coverage=0,
                status=selection_status,
                detail=selection_detail,
            )

        annotation = selected.annotation
        extracted = extract_measurement_values(annotation)
        workbook.write_measurements(row_number, extracted.values)
        paths = self._image_output.paths_for(selected, output_directory)
        detail_parts = self._detail_parts(
            candidates=candidates,
            selection_detail=selection_detail,
            duplicate_columns=extracted.duplicate_columns,
            invalid_columns=extracted.invalid_columns,
        )
        keypoint_count = count_annotation_keypoints(annotation)
        raw_layer = (annotation or {}).get("vertebraeLayer")
        missing_annotation = not isinstance(raw_layer, list) or not raw_layer

        try:
            await self._image_output.write(
                candidate=selected,
                annotation=annotation,
                paths=paths,
                overwrite=overwrite,
            )
        except (
            ObjectStorageObjectNotFoundError,
            ObjectStorageUnavailableError,
        ) as exc:
            detail_parts.append(str(exc))
            status = (
                "object_missing"
                if isinstance(exc, ObjectStorageObjectNotFoundError)
                else "storage_unavailable"
            )
            return self._selected_result(
                row_number=row_number,
                filename=filename,
                selected=selected,
                candidates=candidates,
                output_path=paths.relative_png.as_posix(),
                keypoint_count=keypoint_count,
                measurement_coverage=extracted.coverage,
                status=status,
                detail_parts=detail_parts,
            )
        except Exception as exc:  # noqa: BLE001 - continue after per-file failures.
            detail_parts.append(str(exc))
            return self._selected_result(
                row_number=row_number,
                filename=filename,
                selected=selected,
                candidates=candidates,
                output_path=paths.relative_png.as_posix(),
                keypoint_count=keypoint_count,
                measurement_coverage=extracted.coverage,
                status="export_failed",
                detail_parts=detail_parts,
            )

        if missing_annotation:
            detail_parts.append("缺少 vertebraeLayer，已输出空 LabelMe JSON")
        return self._selected_result(
            row_number=row_number,
            filename=filename,
            selected=selected,
            candidates=candidates,
            output_path=paths.relative_png.as_posix(),
            keypoint_count=keypoint_count,
            measurement_coverage=extracted.coverage,
            status="missing_annotation" if missing_annotation else "exported",
            detail_parts=detail_parts,
        )

    async def _select_candidate(
        self,
        candidates: list[DatasetExportCandidate],
    ) -> tuple[DatasetExportCandidate | None, str, str]:
        if not candidates:
            return None, "not_found", "未找到符合条件的侧位影像"
        failures: list[str] = []
        saw_missing_object = False
        for candidate in candidates:
            if not candidate.patient_identifier:
                failures.append(f"影像 {candidate.image_file_id} 缺少 PatientID")
                continue
            try:
                stored = await self._storage.stat_object(
                    bucket=candidate.storage_bucket,
                    object_key=candidate.object_key,
                )
            except ObjectStorageObjectNotFoundError:
                saw_missing_object = True
                failures.append(f"影像 {candidate.image_file_id} 的对象不存在")
                continue
            except ObjectStorageUnavailableError as exc:
                return None, "storage_unavailable", str(exc)
            if stored.size <= 0 or stored.size != candidate.file_size:
                saw_missing_object = True
                failures.append(
                    f"影像 {candidate.image_file_id} 对象大小不一致: "
                    f"db={candidate.file_size}, storage={stored.size}"
                )
                continue
            return candidate, "selected", "; ".join(failures)
        return (
            None,
            "object_missing" if saw_missing_object else "invalid_candidate",
            "; ".join(failures) or "没有可导出的有效候选",
        )

    @staticmethod
    def _detail_parts(
        *,
        candidates: list[DatasetExportCandidate],
        selection_detail: str,
        duplicate_columns: tuple[str, ...],
        invalid_columns: tuple[str, ...],
    ) -> list[str]:
        details = [selection_detail] if selection_detail else []
        if len(candidates) > 1:
            details.append(f"同名候选 {len(candidates)} 条，使用最新有效记录")
        if duplicate_columns:
            details.append(f"重复测量使用最后一条: {', '.join(duplicate_columns)}")
        if invalid_columns:
            details.append(f"无法解析测量值: {', '.join(invalid_columns)}")
        return details

    @staticmethod
    def _selected_result(
        *,
        row_number: int,
        filename: str,
        selected: DatasetExportCandidate,
        candidates: list[DatasetExportCandidate],
        output_path: str,
        keypoint_count: int,
        measurement_coverage: int,
        status: str,
        detail_parts: list[str],
    ) -> DatasetExportItemResult:
        return DatasetExportItemResult(
            row_number=row_number,
            requested_filename=filename,
            image_file_id=selected.image_file_id,
            patient_identifier=selected.patient_identifier,
            candidate_count=len(candidates),
            candidate_ids=tuple(item.image_file_id for item in candidates),
            exam_type=selected.description,
            output_path=output_path,
            keypoint_count=keypoint_count,
            measurement_coverage=measurement_coverage,
            status=status,
            detail="; ".join(detail_parts),
        )

    @staticmethod
    def _summarize(results: list[DatasetExportItemResult]) -> DatasetExportSummary:
        succeeded = sum(
            result.status in {"exported", "missing_annotation"} for result in results
        )
        return DatasetExportSummary(
            requested=len(results),
            succeeded=succeeded,
            empty_annotations=sum(
                result.status == "missing_annotation" for result in results
            ),
            not_found=sum(result.status == "not_found" for result in results),
            duplicate_overwrites=sum(
                result.candidate_count > 1 and result.image_file_id is not None
                for result in results
            ),
            object_missing=sum(result.status == "object_missing" for result in results),
            failed=len(results) - succeeded,
        )
