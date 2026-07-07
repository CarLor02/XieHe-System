from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ap.application.measurement_service import health_status, load_measurement_models, measure_image
from ap.interfaces.http.schemas import AnnotationsResponse, ObjectImageRequest
from shared.infrastructure.image_io import decode_image_bytes
from shared.infrastructure.object_storage import (
    StorageServiceHTTPError,
    StorageServiceNotConfiguredError,
    StorageServiceUnavailableError,
    fetch_object_image_bytes,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    load_measurement_models()
    yield


app = FastAPI(
    title="AP Spine Analysis API",
    description="AP X-ray AI measurement service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return health_status()


@app.post("/api/measurement", response_model=AnnotationsResponse, response_model_exclude_none=True)
async def measure_object(request: ObjectImageRequest):
    try:
        image_bytes = fetch_object_image_bytes(request.bucket, request.object_key)
        image = decode_image_bytes(image_bytes)
        return measure_image(image, request.image_id or "IMG001")
    except StorageServiceNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except StorageServiceHTTPError as exc:
        raise HTTPException(status_code=exc.status_code, detail=f"Storage service error: {exc.reason}") from exc
    except StorageServiceUnavailableError as exc:
        raise HTTPException(status_code=502, detail=f"Storage service unavailable: {exc.reason}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
