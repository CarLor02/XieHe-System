#!/usr/bin/env python3
"""Legacy note for the removed AP upload debug API."""


def main() -> int:
    print(
        "The AP service no longer exposes upload /predict. "
        "Use POST /api/measurement with an object-storage reference, "
        "or run model/ap/scripts/export_ai_measurements.py with --raw-output-dir."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
