import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/measurements", tags=["measurements"])

# Sensible slider bounds (cm) shown around whatever the pipeline returns,
# so the user can always fine-tune manually.
SLIDER_BOUNDS = {
    "height_cm": (140, 210),
    "chest_cm": (70, 140),
    "waist_cm": (55, 130),
    "hip_cm": (70, 140),
    "shoulder_cm": (35, 55),
    "inseam_cm": (60, 95),
}

FALLBACK_DEFAULTS = {
    "height_cm": 170,
    "chest_cm": 96,
    "waist_cm": 82,
    "hip_cm": 98,
    "shoulder_cm": 44,
    "inseam_cm": 78,
}


class MeasurementRequest(BaseModel):
    front_image_base64: str
    side_image_base64: str
    height_cm: float


@router.get("/bounds")
def get_bounds():
    """Slider min/max/default so the frontend can render sliders even before a photo is processed."""
    return {"bounds": SLIDER_BOUNDS, "defaults": FALLBACK_DEFAULTS}


@router.post("/estimate")
def estimate(req: MeasurementRequest):
    """
    Forwards the front/side photos + height to the standalone measurement
    microservice (see measurement-service/ - deploy it separately, e.g. to
    Hugging Face Spaces, so this main backend stays lightweight and doesn't
    need MediaPipe/OpenCV installed locally).

    Falls back to average defaults (still fully adjustable via sliders) if
    MEASUREMENT_PIPELINE_URL isn't configured or the service is unreachable,
    so the UI never hard-fails.
    """
    if not (140 <= req.height_cm <= 230):
        raise HTTPException(status_code=400, detail="Please enter a height between 140cm and 230cm.")

    pipeline_url = os.getenv("MEASUREMENT_PIPELINE_URL")
    measurements = dict(FALLBACK_DEFAULTS)
    measurements["height_cm"] = req.height_cm
    source = "pipeline"
    message = None

    if pipeline_url:
        try:
            resp = requests.post(
                pipeline_url,
                json={
                    "front_image_base64": req.front_image_base64,
                    "side_image_base64": req.side_image_base64,
                    "height_cm": req.height_cm,
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            pipeline_measurements = data.get("measurements", data)
            for key in SLIDER_BOUNDS:
                if key in pipeline_measurements and pipeline_measurements[key] is not None:
                    measurements[key] = pipeline_measurements[key]
        except requests.RequestException as e:
            source = "fallback_default"
            message = f"Couldn't reach the measurement service ({e}); showing average defaults instead."
    else:
        source = "fallback_default"
        message = (
            "MEASUREMENT_PIPELINE_URL isn't configured yet - deploy measurement-service/ "
            "(see its README) and add the URL to backend/.env to enable real photo-based estimation."
        )

    # clamp into slider bounds
    for key, (lo, hi) in SLIDER_BOUNDS.items():
        measurements[key] = max(lo, min(hi, measurements[key]))

    return {"source": source, "message": message, "measurements": measurements, "bounds": SLIDER_BOUNDS}
