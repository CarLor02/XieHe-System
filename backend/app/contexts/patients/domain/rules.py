"""Pure patient normalization rules shared by commands and queries."""

from datetime import date
from enum import Enum


class PatientGender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


_GENDER_INPUT_MAP = {
    "男": PatientGender.MALE,
    "女": PatientGender.FEMALE,
    "其他": PatientGender.OTHER,
    "未知": PatientGender.UNKNOWN,
    "male": PatientGender.MALE,
    "female": PatientGender.FEMALE,
    "other": PatientGender.OTHER,
    "unknown": PatientGender.UNKNOWN,
}

_GENDER_DISPLAY_MAP = {
    PatientGender.MALE: "男",
    PatientGender.FEMALE: "女",
    PatientGender.OTHER: "其他",
    PatientGender.UNKNOWN: "未知",
}


def calculate_age(birth_date: date | None, *, today: date | None = None) -> int | None:
    if birth_date is None:
        return None
    current = today or date.today()
    return (
        current.year
        - birth_date.year
        - ((current.month, current.day) < (birth_date.month, birth_date.day))
    )


def gender_from_input(value: str) -> PatientGender:
    return _GENDER_INPUT_MAP.get(value.strip().lower(), PatientGender.UNKNOWN)


def gender_to_display(value: PatientGender | None) -> str:
    if value is None:
        return "未知"
    return _GENDER_DISPLAY_MAP.get(value, "未知")
