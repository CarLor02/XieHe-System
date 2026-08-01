"""Schemas for the patient management HTTP interface."""

import typing
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


def _blank_string_to_none(value: typing.Any) -> typing.Any:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


OPTIONAL_PATIENT_FIELDS = (
    "birth_date",
    "phone",
    "email",
    "address",
    "emergency_contact_name",
    "emergency_contact_phone",
    "id_card",
    "insurance_number",
)


class PatientBase(BaseModel):
    patient_id: str = Field(..., description="患者编号", max_length=50)
    name: str = Field(..., description="患者姓名", max_length=100)
    gender: str = Field(..., description="性别")
    birth_date: date | None = Field(None, description="出生日期")
    phone: str | None = Field(None, description="联系电话", max_length=20)
    email: str | None = Field(None, description="邮箱地址", max_length=100)
    address: str | None = Field(None, description="联系地址", max_length=500)
    emergency_contact_name: str | None = Field(
        None, description="紧急联系人", max_length=100
    )
    emergency_contact_phone: str | None = Field(
        None, description="紧急联系电话", max_length=20
    )
    id_card: str | None = Field(None, description="身份证号", max_length=18)
    insurance_number: str | None = Field(None, description="医保号", max_length=50)

    @field_validator(*OPTIONAL_PATIENT_FIELDS, mode="before")
    @classmethod
    def normalize_blank_optional_values(cls, value: typing.Any) -> typing.Any:
        return _blank_string_to_none(value)


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: str | None = Field(None, description="患者姓名", max_length=100)
    gender: str | None = Field(None, description="性别")
    birth_date: date | None = Field(None, description="出生日期")
    phone: str | None = Field(None, description="联系电话", max_length=20)
    email: str | None = Field(None, description="邮箱地址", max_length=100)
    address: str | None = Field(None, description="联系地址", max_length=500)
    emergency_contact_name: str | None = Field(
        None, description="紧急联系人", max_length=100
    )
    emergency_contact_phone: str | None = Field(
        None, description="紧急联系电话", max_length=20
    )
    id_card: str | None = Field(None, description="身份证号", max_length=18)
    insurance_number: str | None = Field(None, description="医保号", max_length=50)

    @field_validator(*OPTIONAL_PATIENT_FIELDS, mode="before")
    @classmethod
    def normalize_blank_optional_values(cls, value: typing.Any) -> typing.Any:
        return _blank_string_to_none(value)


class PatientResponse(BaseModel):
    id: int
    patient_id: str
    name: str
    gender: str
    birth_date: date | None
    age: int | None
    phone: str | None
    email: str | None
    address: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    id_card: str | None
    insurance_number: str | None
    status: str
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
