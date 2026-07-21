"""
Body measurement estimation pipeline - MediaPipe edition.

This is a direct, modularized port of the working capture-and-measure logic
(originally a live-webcam OpenCV script) into a stateless function that takes
two already-captured photos (front + side) and a real height, and returns
the same six measurements the rest of the app expects.

Only the libraries the original script used are used here: cv2, numpy,
mediapipe, and math. No YOLO/ultralytics/torch.

Pipeline, per photo:
  1. MediaPipe Pose (with segmentation enabled) gives both body keypoints
     AND a person segmentation mask in a single pass.
  2. The front photo's keypoints establish a pixels-per-cm scale from the
     user's real height (nose -> ankle-midpoint), and give shoulder width
     and leg length directly.
  3. The front mask gives chest/waist/hip WIDTH (measured at y-rows derived
     from the shoulder/hip keypoints, same 20% / 55% torso-fraction rule
     used for chest/waist as in the original script).
  4. The side mask gives chest/waist/hip DEPTH at the same three body-relative
     row ratios (0.38 / 0.50 / 0.58) used in the original script.
  5. Width + depth at each level are combined into a circumference via an
     ellipse-circumference approximation (Ramanujan's formula) - same as
     the original script.

Models are loaded lazily and cached (module-level singletons), since
constructing a MediaPipe Pose instance is relatively expensive and
shouldn't happen at import time or slow down `uvicorn --reload`.
"""
import math
import cv2
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose

# MediaPipe Pose landmark indices used throughout (BlazePose 33-point model).
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28

_pose_singleton = None


class MeasurementError(Exception):
    """Raised when a photo can't be processed (no person detected, bad angle, etc.)."""


def _get_pose_model():
    """Lazily creates (once) and caches the MediaPipe Pose solution used for
    every request - loading it is the expensive part, so it's not redone
    per-photo or per-request."""
    global _pose_singleton
    if _pose_singleton is None:
        _pose_singleton = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    return _pose_singleton


def decode_image(image_bytes: bytes):
    """Raw photo bytes -> RGB numpy array, matching cv2's decode + BGR->RGB
    swap from the original script."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise MeasurementError("That file couldn't be read as an image.")
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def run_pose(image_rgb):
    """Runs MediaPipe Pose (pose + segmentation together) on one image.
    Returns (landmarks_xy_px, segmentation_mask) or raises MeasurementError
    if no person / no segmentation was found."""
    pose_model = _get_pose_model()
    results = pose_model.process(image_rgb)

    if not results.pose_landmarks:
        raise MeasurementError("Couldn't detect a person in that photo. Try a clearer, full-length shot.")
    if results.segmentation_mask is None:
        raise MeasurementError("Couldn't isolate a body outline in that photo. Try a plainer background.")

    h, w = image_rgb.shape[:2]
    landmarks_px = np.array(
        [[lm.x * w, lm.y * h] for lm in results.pose_landmarks.landmark]
    )
    mask = (results.segmentation_mask > 0.5).astype(np.uint8)

    return landmarks_px, mask


def body_height_px(mask):
    """Pixel height of the segmented body (top of mask to bottom of mask)."""
    ys, _xs = np.where(mask > 0)
    if ys.size == 0:
        return None
    return float(ys.max() - ys.min())


def get_width(mask, y, center_x):
    """Width (in px) of the mask's "on" run at row y, scanning outward from
    center_x - same approach as the original script's get_width()."""
    h, w = mask.shape
    y = max(0, min(h - 1, int(round(y))))
    row = mask[y]
    xs = np.where(row > 0)[0]
    if xs.size == 0:
        return 0.0
    return float(xs.max() - xs.min())


def get_depth(mask, ratio):
    """Width (in px) of the mask's "on" run at a row placed at `ratio` of
    the way down the mask's own bounding box (used on the SIDE photo, where
    that width corresponds to body depth, front-to-back) - same approach as
    the original script's get_depth()."""
    ys, _xs = np.where(mask > 0)
    if ys.size == 0:
        return 0.0
    ymin, ymax = ys.min(), ys.max()
    y = int(ymin + (ymax - ymin) * ratio)
    row = mask[y, :]
    xs = np.where(row > 0)[0]
    if xs.size == 0:
        return 0.0
    return float(xs.max() - xs.min())


def ellipse_circumference(width, depth):
    """Approximates a body cross-section as an ellipse and returns its
    circumference (Ramanujan's second approximation) - same formula as the
    original script."""
    a, b = width / 2, depth / 2
    return math.pi * (3 * (a + b) - math.sqrt((3 * a + b) * (a + 3 * b)))


def estimate_measurements(front_bytes: bytes, side_bytes: bytes, height_cm: float) -> dict:
    """
    front_bytes / side_bytes: raw image bytes (full-length photos,
    front-facing and side-facing respectively).
    height_cm: the user's real height, used to convert pixels to cm.

    Returns a dict of height_cm, chest_cm, waist_cm, hip_cm, shoulder_cm,
    inseam_cm - matching the slider keys used by the /measurements API.
    """
    front = decode_image(front_bytes)
    side = decode_image(side_bytes)

    front_kpts, front_mask = run_pose(front)
    _side_kpts, side_mask = run_pose(side)

    # ---- Scale: real height / pixel height of the front-photo mask ----
    front_pixel_height = body_height_px(front_mask)
    if not front_pixel_height:
        raise MeasurementError("Couldn't measure your outline in the front photo.")
    mask_scale = height_cm / front_pixel_height

    # ---- Shoulder width + leg length, straight from front keypoints ----
    shoulder_cm = float(
        np.linalg.norm(front_kpts[LEFT_SHOULDER] - front_kpts[RIGHT_SHOULDER])
    ) * mask_scale

    hip_mid = (front_kpts[LEFT_HIP] + front_kpts[RIGHT_HIP]) / 2
    ankle_mid = (front_kpts[LEFT_ANKLE] + front_kpts[RIGHT_ANKLE]) / 2
    knee_mid = (front_kpts[LEFT_KNEE] + front_kpts[RIGHT_KNEE]) / 2
    inseam_cm = float(
        np.linalg.norm(hip_mid - knee_mid) + np.linalg.norm(knee_mid - ankle_mid)
    ) * mask_scale

    # ---- Row placement for chest/waist (front) and hip, from keypoints ----
    shoulder_y = (front_kpts[LEFT_SHOULDER][1] + front_kpts[RIGHT_SHOULDER][1]) / 2
    hip_y = (front_kpts[LEFT_HIP][1] + front_kpts[RIGHT_HIP][1]) / 2
    torso = hip_y - shoulder_y
    chest_y = shoulder_y + 0.20 * torso
    waist_y = shoulder_y + 0.55 * torso
    center_x = (front_kpts[LEFT_HIP][0] + front_kpts[RIGHT_HIP][0]) / 2

    chest_width = get_width(front_mask, chest_y, center_x) * mask_scale
    waist_width = get_width(front_mask, waist_y, center_x) * mask_scale
    hip_width = get_width(front_mask, hip_y, center_x) * mask_scale

    # ---- Depth from the side photo, at the same body-relative ratios ----
    chest_depth = get_depth(side_mask, 0.38) * mask_scale
    waist_depth = get_depth(side_mask, 0.50) * mask_scale
    hip_depth = get_depth(side_mask, 0.58) * mask_scale

    chest_cm = ellipse_circumference(chest_width, chest_depth)
    waist_cm = ellipse_circumference(waist_width, waist_depth)
    hip_cm = ellipse_circumference(hip_width, hip_depth)

    return {
        "height_cm": round(float(height_cm), 1),
        "chest_cm": round(chest_cm, 1),
        "waist_cm": round(waist_cm, 1),
        "hip_cm": round(hip_cm, 1),
        "shoulder_cm": round(shoulder_cm, 1),
        "inseam_cm": round(inseam_cm, 1),
    }
