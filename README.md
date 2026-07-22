# StyleHub — AI-Powered Fashion Shopping (Myntra-themed demo)

A full-stack e-commerce demo: React + Tailwind frontend, FastAPI + SQLite backend,
a Groq-powered fashion chatbot docked as a side panel, an AI body-measurement flow
with live pose tracking, and a live body-vs-garment fit visualiser — all styled in
Myntra's signature pink/teal palette.

The heavy ML pipeline for "Get my size" lives in its own service
(`measurement-service/`) so it's easy to keep separate from the lightweight
backend — run it locally alongside everything else (see below), or deploy it
to the cloud so your laptop never installs MediaPipe/OpenCV at all — see
[Wiring in the measurement pipeline](#4-wiring-in-the-measurement-pipeline).

## What's included

- **25 sample products** — 5 categories (T-Shirts, Jeans, Dresses, Jackets, Sneakers) ×
  5 brands each, seeded automatically into SQLite on first run, each with one
  image, a handful of reviews, and past-order history.
- **Product page** — image, price/MRP, material & quality notes, reviews, and
  "most-ordered size" signal from past orders.
- **AI stylist chatbot (Groq)**, docked as a side panel — splits the screen 60/40
  (product content / chat) when open, on both the home page and product pages, rather
  than floating over the page. It stays pinned to the right edge regardless of
  scroll. When a product page is open, the chatbot is automatically given that
  product's full data (price, material, reviews, size distribution) as context.
  The chat toggle button always stays visible and clickable — it repositions
  itself just outside the panel's edge rather than being covered by it.
- **"Get my size" flow** — the user enters their height (feet/inches), then takes a front-facing and a
  side-facing shot right in the chat using their own camera (`CameraCapture.jsx`), aligned to an on-screen
  outline guide, with a **live MediaPipe pose skeleton** (joints + connections) drawn over the video feed in
  real time as a framing aid. Either capture step can be expanded to fill the screen with a bigger preview
  via a maximize button, without interrupting the live camera stream. Each frame is captured once, sent for
  processing, and immediately discarded from memory — no photo is ever uploaded as a file, downloaded, or
  written to disk anywhere, client or server. The frames are sent to a standalone MediaPipe pose-estimation +
  segmentation pipeline (`measurement-service/`, deployed separately) which estimates chest, waist, hip,
  shoulder, and inseam. Results come back as sliders — shown and adjustable in inches — so the user can
  fine-tune before saving that profile under a name (e.g. "Me", "Mom") right in the chat. Only these 6
  numbers per saved person are ever kept; the photos are processed in memory and never stored.
  - Chest/waist/hip are measured as the *contiguous* run of body pixels around the
    torso's centerline at each row, capped to a sane multiple of shoulder width —
    not the full left-to-right span of that row. A plain span would silently sweep
    in a hand/forearm resting at the person's side (most noticeably at hip height),
    wildly inflating those three numbers; see the comments in
    `measurement-service/measurement_pipeline.py` for the full explanation.
- **"Visualise & Compare" fit preview** — a chat-only option that draws a stylized
  silhouette for whichever saved profile you pick, overlaid with the product you're
  viewing's garment silhouette, plus an optional second product of the same category
  (found via an in-chat search) so you can compare two items' fit side by side. Like
  the capture steps, it can be expanded to fill the screen. All three shapes are
  generated live from real numbers — the person's 6 saved measurements
  (`src/lib/bodyGarmentEngine.js`) and the shop's own size charts (`src/sizeCharts.js`)
  — no photo or pixel mask is ever stored, so the comparison updates instantly if you
  switch profiles, sizes, or the compared product.
- **Language switcher + voice** — chatbot replies can be requested in multiple
  languages (via Groq), and voice input/output uses the browser's native Web Speech
  API (speech-to-text for asking, text-to-speech for replies).
- **Template quick-questions** for fast chat starts — collapsible via a small toggle
  so they don't permanently take up space in the chat panel.

## Project layout

```
myntra-ai-shop/
  backend/                FastAPI app (lightweight - no ML deps)
    app/
      main.py             app entrypoint, CORS, router wiring
      database.py         SQLite schema + connection helper
      seed_data.py         seeds 25 products (1 image each), reviews, orders
      routers/
        products.py       product list/detail/reviews/orders endpoints
        chat.py           Groq chatbot endpoint (product-aware, multi-language)
        measurements.py   forwards photos to measurement-service (with fallback)
    requirements.txt
    .env.example          copy to .env and fill in
  measurement-service/     STANDALONE "get my size" pipeline - deploy separately
    main.py                FastAPI wrapper
    measurement_pipeline.py  MediaPipe pose + segmentation logic
    Dockerfile              for Hugging Face Spaces / Render / etc.
    README.md               deployment walkthrough (HF Spaces, Render, Modal)
  frontend/                React + Vite + Tailwind app
    src/
      lib/
        silhouette.js       legacy parametric body/garment SVG generator (product-page card)
        bodyGarmentEngine.js  measurement -> SVG outline math for "Visualise & Compare"
        units.js             cm <-> inches / feet conversion helpers
      sizeCharts.js          per-category, per-size size chart (source of all garment data)
      MeasurementsContext.jsx  stores the active user's 6 measurement numbers
      ProfilesContext.jsx      stores named saved profiles (name + 6 numbers per person)
      pages/                 Home, ProductPage
      components/
        ImageGallery.jsx        single product image (no leftover multi-image UI)
        BodyGarmentOverlay.jsx  the product-page fit-preview silhouette card
        Navbar, ProductCard, Reviews, PastOrders
        Chatbot/
          ChatButton.jsx       persistent floating toggle (always visible, repositions
                                itself beside the docked panel so it's never covered)
          ChatWindow.jsx       the docked 40%-width side panel (fixed to the right edge)
          ChatWidget.jsx       owns chat state, wires ChatButton + ChatWindow together
          CameraCapture.jsx    live camera + MediaPipe pose overlay + maximize mode
          ChatCompare.jsx      "Visualise & Compare" widget + maximize mode
          MeasurementSliders.jsx  height entry -> capture -> adjustable sliders -> save
          TemplateQuestions.jsx, LanguageSelector.jsx, VoiceButton.jsx, voice.js
```

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