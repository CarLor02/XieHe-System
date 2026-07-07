#!/usr/bin/env python3
"""Legacy note for the removed LAT step-by-step debug API."""


def main() -> int:
    print(
        "The LAT service no longer exposes /api/detect, "
        "/api/detect_and_keypoints, or /api/calculate_metrics. "
        "Use POST /api/measurement or model/lat/scripts/export_ai_measurements.py."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
