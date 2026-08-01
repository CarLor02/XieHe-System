"""Cache namespace ownership for the patient context."""

PATIENT_LIST_NAMESPACE = "patients:list"


def patient_detail_namespace(patient_id: int) -> str:
    return f"patients:detail:{patient_id}"


def patient_archive_namespace(patient_id: int) -> str:
    return f"patients:archive:{patient_id}"
