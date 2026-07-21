# Get-My-Size Measurement Service (standalone)

This is the only part of the project that needs heavy ML dependencies
(MediaPipe). Deploy it by itself to a cloud host, then point
your local backend at it — your laptop only runs the lightweight FastAPI +
React + SQLite stack.

It exposes one endpoint:

```
POST /estimate
{ "front_image_base64": "...", "side_image_base64": "...", "height_cm": 172 }

-> { "measurements": { "height_cm", "chest_cm", "waist_cm", "hip_cm", "shoulder_cm", "inseam_cm" } }
```

---

## Option A — Hugging Face Spaces (recommended: free, easiest)

1. Go to https://huggingface.co/new-space
2. Pick a name, set **SDK = Docker**, visibility Public or Private, hardware
   **CPU basic (free)** to start.
3. Upload the contents of this `measurement-service/` folder to the Space
   (via the web UI "Files" tab, or `git push` — Spaces are git repos):
   ```bash
   git clone https://huggingface.co/spaces/<your-username>/<space-name>
   cp -r measurement-service/* <space-name>/
   cd <space-name>
   git add .
   git commit -m "Add measurement service"
   git push
   ```
4. Wait for the Space to build (a couple of minutes — it's installing MediaPipe + OpenCV).
5. Your endpoint is now live at:
   `https://<your-username>-<space-name>.hf.space/estimate`
6. Test it's up: `https://<your-username>-<space-name>.hf.space/` should
   return `{"status": "ok", ...}`.

CPU basic is free forever but slow-ish (a few seconds per request, similar
to running locally). If you want it faster, Spaces also offers paid GPU
tiers you can switch to anytime from the Space's Settings tab.

---

## Option B — Render

1. Push this folder to its own GitHub repo (or a subfolder of your main repo).
2. On https://render.com → New → Web Service → connect the repo.
3. Runtime: **Docker** (it'll auto-detect the `Dockerfile`).
4. Instance type: at least the smallest **paid** tier — the free tier's
   512MB RAM is too small for MediaPipe's pose model, it will
   crash/OOM.
5. Deploy. Render gives you a URL like `https://your-service.onrender.com`.

---

## Option C — Modal (serverless, pay-per-use, scales to zero)

Modal is a good fit if usage will be occasional — you pay only while a
request is running, not for idle time. It needs a small amount of
Modal-specific wrapper code instead of a plain Dockerfile; see
https://modal.com/docs/guide for a walkthrough of deploying a FastAPI app
with a `requirements.txt`. Mention it if you want help writing that
wrapper — it's a quick addition on top of `main.py`.

---

## Wiring it into the main project

Once you have a public URL, put it in `backend/.env`:

```
MEASUREMENT_PIPELINE_URL=https://<your-username>-<space-name>.hf.space/estimate
```

Then just run the main backend/frontend on your laptop as normal — no ML
dependencies needed locally anymore.
