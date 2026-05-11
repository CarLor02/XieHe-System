from app.api.v1.endpoints.patients.schemas.management import (
    PatientCreate,
    PatientUpdate,
)


def test_patient_create_normalizes_blank_optional_values_to_none() -> None:
    patient = PatientCreate(
        patient_id="P202605119514",
        name="test",
        gender="男",
        birth_date="",
        phone="",
        email="",
        address="",
        emergency_contact_name="",
        emergency_contact_phone="",
        id_card="",
        insurance_number="",
    )

    assert patient.birth_date is None
    assert patient.phone is None
    assert patient.email is None
    assert patient.address is None
    assert patient.emergency_contact_name is None
    assert patient.emergency_contact_phone is None
    assert patient.id_card is None
    assert patient.insurance_number is None


def test_patient_update_normalizes_blank_optional_values_to_none() -> None:
    patient = PatientUpdate(id_card="   ", birth_date="")

    assert patient.id_card is None
    assert patient.birth_date is None
