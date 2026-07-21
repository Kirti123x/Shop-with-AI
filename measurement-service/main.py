"""
Standalone "Get my size" microservice.

This is the ONLY piece of the project that needs heavier ML dependencies
(MediaPipe + OpenCV). Deploy this by itself to a cloud host (Hugging Face
Spaces, Render, Modal, etc.) and point your main backend's
MEASUREMENT_PIPELINE_URL at wherever it ends up. Everything else in the
project (frontend, main backend, DB, chatbot) keeps running on your laptop.
"""
import base64
import binascii
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from measurement_pipeline import estimate_measurements, MeasurementError

app = FastAPI(title="Get-My-Size Measurement Service")


class MeasurementRequest(BaseModel):
    front_image_base64: str
    side_image_base64: str
    height_cm: float


def _decode_b64(data: str, label: str) -> bytes:
    try:
        return base64.b64decode(data)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail=f"Invalid {label} image data.")


@app.get("/")
def health():
    return {"status": "ok", "service": "measurement-pipeline"}


@app.post("/estimate")
def estimate(req: MeasurementRequest):
    if not (140 <= req.height_cm <= 230):
        raise HTTPException(status_code=400, detail="Height must be between 140cm and 230cm.")

    front_bytes = _decode_b64(req.front_image_base64, "front")
    side_bytes = _decode_b64(req.side_image_base64, "side")

    try:
        measurements = estimate_measurements(front_bytes, side_bytes, req.height_cm)
    except MeasurementError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {"measurements": measurements}
