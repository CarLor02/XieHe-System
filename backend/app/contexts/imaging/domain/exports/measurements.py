"""Measurement-column aliases and value extraction for dataset exports."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Mapping, Sequence

MEASUREMENT_COLUMN_ALIASES: dict[str, frozenset[str]] = {
    "T1 slope": frozenset({"t1-slope", "t1 slope"}),
    "C2-7": frozenset({"cl", "c2-c7-cl", "c2-c7 cl"}),
    "T2-5": frozenset({"tk-t2-t5", "tk t2-t5"}),
    "T5-12": frozenset({"tk-t5-t12", "tk t5-t12"}),
    "T10-L2": frozenset({"t10-l2"}),
    "T12-L1": frozenset({"t12-l1"}),
    "L1-4": frozenset({"ll-l1-l4", "ll l1-l4"}),
    "L4-S1": frozenset({"ll-l4-s1", "ll l4-s1"}),
    "L1-S1": frozenset({"ll-l1-s1", "ll l1-s1"}),
    "PI": frozenset({"pi"}),
    "PT": frozenset({"pt"}),
    "SS": frozenset({"ss"}),
}

_NUMBER = re.compile(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?")
_ALIAS_TO_COLUMN = {
    alias: column
    for column, aliases in MEASUREMENT_COLUMN_ALIASES.items()
    for alias in aliases
}


@dataclass(frozen=True, slots=True)
class MeasurementExtraction:
    values: dict[str, float]
    duplicate_columns: tuple[str, ...]
    invalid_columns: tuple[str, ...]

    @property
    def coverage(self) -> int:
        return len(self.values)


def _measurement_number(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    match = _NUMBER.search(value.strip())
    if match is None:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def extract_measurement_values(
    annotation: Mapping[str, object] | None,
) -> MeasurementExtraction:
    """Extract the final persisted occurrence for each fixed workbook column."""

    raw_measurements = (annotation or {}).get("measurements")
    if not isinstance(raw_measurements, Sequence) or isinstance(
        raw_measurements, (str, bytes)
    ):
        return MeasurementExtraction({}, (), ())

    values: dict[str, float] = {}
    seen: dict[str, int] = {}
    invalid: set[str] = set()
    for item in raw_measurements:
        if not isinstance(item, Mapping):
            continue
        raw_type = item.get("type")
        if not isinstance(raw_type, str):
            continue
        column = _ALIAS_TO_COLUMN.get(raw_type.strip().lower())
        if column is None:
            continue
        seen[column] = seen.get(column, 0) + 1
        parsed = _measurement_number(item.get("value"))
        if parsed is None:
            values.pop(column, None)
            invalid.add(column)
            continue
        values[column] = parsed
        invalid.discard(column)

    duplicates = tuple(
        column for column in MEASUREMENT_COLUMN_ALIASES if seen.get(column, 0) > 1
    )
    invalid_columns = tuple(
        column for column in MEASUREMENT_COLUMN_ALIASES if column in invalid
    )
    return MeasurementExtraction(values, duplicates, invalid_columns)
