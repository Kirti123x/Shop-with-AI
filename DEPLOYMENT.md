## 1. Measurement service setup (local)

This is the "Get my size" ML pipeline (MediaPipe + OpenCV) — the only part of
the project with heavy dependencies. Run it locally like this, or skip to
[section 4](#4-wiring-in-the-measurement-pipeline) to deploy it to the cloud instead
and skip installing MediaPipe on your machine entirely.

```bash
cd measurement-service
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

uvicorn main:app --reload --port 9001
```

Confirm it's up at `http://localhost:9001/` — it should return
`{"status": "ok", "service": "measurement-pipeline"}`. Leave this running in
its own terminal; the backend (section 2) calls into it over HTTP.

## 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set:
#   GROQ_API_KEY=your_real_key              (get one at https://console.groq.com)
#   MEASUREMENT_PIPELINE_URL=http://127.0.0.1:9001/estimate   (matches section 1's port)

uvicorn app.main:app --reload --port 8000
```

The SQLite database (`backend/shop.db`) and all 25 products are created
automatically on first startup. API docs are available at
`http://localhost:8000/docs`. This backend itself has **no ML dependencies** —
those all live in `measurement-service/` (section 1).

**If `MEASUREMENT_PIPELINE_URL` isn't set yet, or the service is
unreachable:** the app still works — `/api/measurements/estimate` falls back
to reasonable average measurements (sliders still render and are fully
adjustable), and the chat shows why.

**After editing `.env`, fully restart `uvicorn`** (stop with Ctrl+C, run the
command again) — environment variables are only read once at process
startup, so `--reload` alone won't pick up a `.env` change.

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` requests
to `http://localhost:8000`, so make sure the backend is running first.

The live pose-tracking overlay in "Get my size" loads MediaPipe's
`@mediapipe/tasks-vision` model from a CDN at runtime (not an npm
dependency) — it needs internet access the first time it's used per browser
session; after that it's cached. If the CDN is unreachable, photo capture
still works fine, it just won't show the live skeleton.

With all three pieces running, you'll have 3 terminals open at once:
measurement-service (port 9001), backend (port 8000), frontend (port 5173).

## 4. Wiring in the measurement pipeline

You have two options for `measurement-service/`:

- **Local** (section 1 above) — simplest for development; just keep it
  running alongside the backend and point `MEASUREMENT_PIPELINE_URL` at
  `http://127.0.0.1:9001/estimate`.
- **Cloud deploy** — keeps MediaPipe/OpenCV off your machine entirely. Deploy
  the `measurement-service/` folder to a free host — Hugging Face Spaces
  recommended (see `measurement-service/README.md` for a full walkthrough,
  plus Render/Modal alternatives). Once deployed, point `backend/.env` at it
  instead:

  ```
  MEASUREMENT_PIPELINE_URL=https://your-space.hf.space/estimate
  ```

Either way, everything upstream (the chat's live camera capture, the
inches-based sliders, the "Visualise & Compare" silhouette comparison) works
without any frontend changes — only this one URL changes.

## Notes

- Product images use a placeholder photo service (picsum.photos), one per
  product, seeded deterministically — swap `seed_data.py`'s image URL for
  real product photography whenever ready.
- The "Visualise & Compare" silhouette is a stylized proportional mannequin
  generated from plain numbers, not a literal trace of a photo — that's
  intentional (it's what makes it instantly editable and directly comparable
  to a garment's silhouette), worth mentioning explicitly if asked.
- Saved measurement profiles (name + 6 numbers per person) are stored in the
  browser's `localStorage` for this demo — move them to the backend/DB if you
  need them to persist across devices or be visible to other systems.
- The chat panel splits the screen 60/40 only on medium+ screens; on small
  phone screens it opens as a full-width overlay instead, since a 40% sliver
  of a phone screen isn't usable.
- CORS is wide open (`allow_origins=["*"]`) for local development — restrict
  this to your real frontend origin before deploying.