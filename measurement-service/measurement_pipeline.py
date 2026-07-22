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
mp_drawing = mp.solutions.drawing_utils

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


def capture_front_and_side_photos(camera_index: int = 0):
    """
    Opens the webcam and keeps it live: every frame is run through MediaPipe
    Pose and the skeleton + numbered landmark points are drawn over the video
    feed in real time, exactly like the original body_measurements.py capture
    script did. The person presses 'c' to grab the current frame - once for
    the front pose, once for the side pose - and the window closes itself
    once both are captured (or 'q' quits early).

    Returns (front_bytes, side_bytes): JPEG-encoded bytes for each capture,
    in the exact form estimate_measurements() expects, e.g.:

        front_bytes, side_bytes = capture_front_and_side_photos()
        result = estimate_measurements(front_bytes, side_bytes, height_cm=175)
    """
    pose_model = _get_pose_model()
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise MeasurementError("Couldn't open the camera.")

    captured = []          # filled in order: [front_bytes, side_bytes]
    labels = ["front", "side"]

    try:
        while cap.isOpened() and len(captured) < 2:
            success, frame = cap.read()
            if not success:
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose_model.process(frame_rgb)

            display_frame = frame.copy()

            if results.pose_landmarks:
                h, w = frame.shape[:2]

                # Live skeleton overlay (same drawing spec as the original script)
                mp_drawing.draw_landmarks(
                    display_frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                    mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2),
                )

                # Numbered landmark points, same as the original script
                for idx, lm in enumerate(results.pose_landmarks.landmark):
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.putText(
                        display_frame, str(idx), (cx + 5, cy - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1,
                    )

            label = labels[len(captured)]
            cv2.putText(
                display_frame, f"Press 'c' to capture {label.upper()} pose  (q = quit)",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2,
            )
            cv2.imshow("Pose", display_frame)

            key = cv2.waitKey(5) & 0xFF
            if key == ord('c'):
                if results.pose_landmarks:
                    ok, buf = cv2.imencode(".jpg", frame)
                    if ok:
                        captured.append(buf.tobytes())
                        print(f"Captured {label} photo.")
                else:
                    print("No person detected yet - hold still and try again.")
            elif key == ord('q'):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()

    if len(captured) != 2:
        raise MeasurementError("Didn't get both front and side captures.")

    return captured[0], captured[1]


def body_height_px(mask):
    """Pixel height of the segmented body (top of mask to bottom of mask)."""
    ys, _xs = np.where(mask > 0)
    if ys.size == 0:
        return None
    return float(ys.max() - ys.min())


def _contiguous_run_width(row, seed_x, max_width_px=None):
    """Expands outward from seed_x through contiguous "on" pixels in `row`,
    stopping at the first background gap on either side. This is the core
    fix for the arms-at-sides bug: a naive `rightmost_on - leftmost_on`
    scan treats a hand/forearm resting near torso height as part of the
    torso the moment it's anywhere on that row, even if there's visible
    background between the arm and the body. Walking outward from a known
    body-centerline seed and stopping at the first gap keeps the scan
    inside the torso's own connected blob.

    `max_width_px`, when given, is a sanity ceiling that still applies even
    if the arm is flush against the torso with *no* visible gap (e.g. a
    sleeve or skin-on-skin contact) - in that case there's no gap to stop
    at, so the ceiling is the only thing that catches it.
    """
    w = row.shape[0]
    seed_x = max(0, min(w - 1, int(round(seed_x))))

    # If the seed itself lands on background (center_x estimate was a
    # little off the true centerline), fall back to the nearest "on" pixel.
    if row[seed_x] == 0:
        on_xs = np.where(row > 0)[0]
        if on_xs.size == 0:
            return 0.0
        seed_x = int(on_xs[np.argmin(np.abs(on_xs - seed_x))])

    left = seed_x
    while left - 1 >= 0 and row[left - 1] > 0:
        left -= 1
    right = seed_x
    while right + 1 < w and row[right + 1] > 0:
        right += 1

    width = float(right - left)
    if max_width_px is not None:
        width = min(width, max_width_px)
    return width


def get_width(mask, y, center_x, max_width_px=None):
    """Width (in px) of the mask's contiguous "on" run at row y, expanding
    outward from center_x and stopping at the first background gap on
    either side (see `_contiguous_run_width`) - replaces the old
    leftmost/rightmost scan, which swept in hands/forearms at arms-at-sides
    height. `max_width_px` is an optional sanity ceiling (pass a
    shoulder-derived bound for chest/waist/hip/shoulder calls)."""
    h, w = mask.shape
    y = max(0, min(h - 1, int(round(y))))
    row = mask[y]
    return _contiguous_run_width(row, center_x, max_width_px)


def get_depth(mask, ratio, center_x=None):
    """Width (in px) of the mask's contiguous "on" run at a row placed at
    `ratio` of the way down the mask's own bounding box (used on the SIDE
    photo, where that width corresponds to body depth, front-to-back).
    Same contiguous-run, gap-stopping approach as `get_width`, for the same
    reason: an arm visible in the side profile shouldn't get merged into
    the torso depth just because it shares the row. If `center_x` isn't
    supplied, the row's own on-pixel midpoint is used as the seed."""
    ys, _xs = np.where(mask > 0)
    if ys.size == 0:
        return 0.0
    ymin, ymax = ys.min(), ys.max()
    y = int(ymin + (ymax - ymin) * ratio)
    row = mask[y, :]

    if center_x is None:
        on_xs = np.where(row > 0)[0]
        if on_xs.size == 0:
            return 0.0
        center_x = (on_xs.min() + on_xs.max()) / 2

    return _contiguous_run_width(row, center_x)


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
    side_kpts, side_mask = run_pose(side)

    # ---- Scale: real height / pixel height of the front-photo mask ----
    front_pixel_height = body_height_px(front_mask)
    if not front_pixel_height:
        raise MeasurementError("Couldn't measure your outline in the front photo.")
    mask_scale = height_cm / front_pixel_height

    # ---- Leg length, straight from front keypoints ----
    hip_mid = (front_kpts[LEFT_HIP] + front_kpts[RIGHT_HIP]) / 2
    ankle_mid = (front_kpts[LEFT_ANKLE] + front_kpts[RIGHT_ANKLE]) / 2
    knee_mid = (front_kpts[LEFT_KNEE] + front_kpts[RIGHT_KNEE]) / 2
    inseam_cm = float(
        np.linalg.norm(hip_mid - knee_mid) + np.linalg.norm(knee_mid - ankle_mid)
    ) * mask_scale

    # ---- Row placement for shoulder/chest/waist (front) and hip, from keypoints ----
    shoulder_y = (front_kpts[LEFT_SHOULDER][1] + front_kpts[RIGHT_SHOULDER][1]) / 2
    hip_y = (front_kpts[LEFT_HIP][1] + front_kpts[RIGHT_HIP][1]) / 2
    torso = hip_y - shoulder_y
    chest_y = shoulder_y + 0.20 * torso
    waist_y = shoulder_y + 0.55 * torso
    center_x = (front_kpts[LEFT_HIP][0] + front_kpts[RIGHT_HIP][0]) / 2

    # ---- Shoulder width: corrected ----
    # The old version measured shoulder-JOINT to shoulder-JOINT distance from
    # keypoints alone. MediaPipe's shoulder landmarks sit near the joint,
    # inboard of the body's actual visible edge, so that number reliably
    # undercounts real shoulder breadth (the measurement a tailor/clothing
    # size chart means). We now also measure the mask's actual width at the
    # shoulder row (same technique already used for chest/waist/hip) and
    # combine the two: keypoint distance as the anatomical floor, mask width
    # as the visible-edge ceiling, and take their average as the corrected
    # estimate.
    shoulder_keypoint_width_px = float(
        np.linalg.norm(front_kpts[LEFT_SHOULDER] - front_kpts[RIGHT_SHOULDER])
    )
    shoulder_keypoint_width = shoulder_keypoint_width_px * mask_scale

    # Sanity ceiling for every mask-based width scan on the front photo.
    # The shoulder keypoint distance is measured directly from pose
    # landmarks, so it's immune to the arm-inclusion bug - it's a solid
    # anatomical reference to clamp against. 1.6x is generous enough to
    # cover genuinely wider hips/chest on real bodies, but well under what
    # you'd get if a hand or forearm got folded into the scan.
    width_cap_px = shoulder_keypoint_width_px * 1.6

    shoulder_mask_width = get_width(front_mask, shoulder_y, center_x, max_width_px=width_cap_px) * mask_scale
    shoulder_cm = (shoulder_keypoint_width + shoulder_mask_width) / 2

    chest_width = get_width(front_mask, chest_y, center_x, max_width_px=width_cap_px) * mask_scale
    waist_width = get_width(front_mask, waist_y, center_x, max_width_px=width_cap_px) * mask_scale
    hip_width = get_width(front_mask, hip_y, center_x, max_width_px=width_cap_px) * mask_scale

    # ---- Depth from the side photo, at the same body-relative ratios ----
    # Seeded from the side photo's OWN pose keypoints (not a naive
    # mask-bounding-box midpoint) so the scan starts at the actual torso
    # center - the bounding-box midpoint is easily thrown off when an arm
    # sits close to the torso in profile, sometimes even landing in
    # background between two blobs and picking up whichever one happens to
    # be nearest.
    side_shoulder_x = (side_kpts[LEFT_SHOULDER][0] + side_kpts[RIGHT_SHOULDER][0]) / 2
    side_hip_x = (side_kpts[LEFT_HIP][0] + side_kpts[RIGHT_HIP][0]) / 2

    chest_depth = get_depth(side_mask, 0.38, center_x=side_shoulder_x) * mask_scale
    waist_depth = get_depth(side_mask, 0.50, center_x=(side_shoulder_x + side_hip_x) / 2) * mask_scale
    hip_depth = get_depth(side_mask, 0.58, center_x=side_hip_x) * mask_scale

    # Sanity ceiling: a torso's front-to-back depth essentially never
    # exceeds its own side-to-side width for ordinary human proportions.
    # This is what actually catches the chest-specific overshoot - at chest
    # height the upper arm sits flush against the ribcage in a side profile,
    # with no visible background gap for the run-scan to stop at, so
    # gap-stopping alone (unlike on the front-photo width scans) doesn't
    # protect depth the same way. Use the already-corrected front-photo
    # width at the same level as the reference.
    chest_depth = min(chest_depth, chest_width)
    waist_depth = min(waist_depth, waist_width)
    hip_depth = min(hip_depth, hip_width)

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