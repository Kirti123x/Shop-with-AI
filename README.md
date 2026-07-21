# StyleHub — AI-Powered Fashion Shopping (Myntra-themed demo)

A full-stack e-commerce demo: React + Tailwind frontend, FastAPI + SQLite backend,
a Groq-powered fashion chatbot, an AI body-measurement flow, and a live
body-vs-garment fit visualiser, all styled in Myntra's signature pink/teal palette.

The heavy ML pipeline for "Get my size" lives in its own deployable service
(`measurement-service/`) so your laptop only ever runs the lightweight parts —
see [Wiring in the measurement pipeline](#3-wiring-in-the-measurement-pipeline) below.

## What's included

- **25 sample products** — 5 categories (T-Shirts, Jeans, Dresses, Jackets, Sneakers) ×
  5 brands each, seeded automatically into SQLite on first run, each with multiple
  images, reviews, and past-order history.
- **Product page** — image gallery, price/MRP, material & quality notes, reviews,
  and "most-ordered size" signal from past orders.
- **AI stylist chatbot (Groq)** — answers fashion questions, and when a product page
  is open it's automatically given that product's full data (price, material, reviews,
  size distribution) as context.
- **"Get my size" flow** — the user enters their height (feet/inches), then takes a front-facing and a
  side-facing shot right in the chat using their own camera (`CameraCapture.jsx`), aligned to an on-screen
  outline guide. Each frame is captured once, sent for processing, and immediately discarded from memory —
  no photo is ever uploaded as a file, downloaded, or written to disk anywhere, client or server. The frames
  are sent to a standalone MediaPipe
  pose-estimation + segmentation pipeline (`measurement-service/`, deployed
  separately) which estimates chest, waist, hip, shoulder, and inseam. Results come
  back as sliders — shown and adjustable in inches — so the user can fine-tune before
  saving that profile under a name (e.g. "Me", "Mom") right in the chat. Only these 6
  numbers per saved person are ever kept; the photos are processed in memory and
  never stored.
- **"Visualise & Compare" fit preview** — a chat-only option that draws a stylized
  silhouette for whichever saved profile you pick, overlaid with the product you're
  viewing's garment silhouette, plus an optional second product (found via an
  in-chat search) so you can compare two items' fit side by side. All three shapes
  are generated live from real numbers — the person's 6 saved measurements
  (`src/lib/bodyGarmentEngine.js`) and the shop's own size charts (`src/sizeCharts.js`)
  — no photo or pixel mask is ever stored, so the comparison updates instantly if you
  switch profiles, sizes, or the compared product.
- **Language switcher + voice** — chatbot replies can be requested in multiple
  languages (via Groq), and voice input/output uses the browser's native Web Speech
  API (speech-to-text for asking, text-to-speech for replies).
- **Template quick-questions** for fast chat starts.

## Project layout

```
myntra-ai-shop/
  backend/                FastAPI app (lightweight - no ML deps)
    app/
      main.py             app entrypoint, CORS, router wiring
      database.py         SQLite schema + connection helper
      seed_data.py         seeds 25 products, images, reviews, orders
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
        BodyGarmentOverlay.jsx  the product-page fit-preview silhouette card
        Navbar, ProductCard, Reviews, PastOrders
        Chatbot/              ChatButton (toggle) + ChatWindow + language/voice/
                               measurement/compare sub-widgets
```

## 1. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# then edit .env and set:
#   GROQ_API_KEY=your_real_key         (get one at https://console.groq.com)
#   MEASUREMENT_PIPELINE_URL=...       (see section 3 - deploy measurement-service/ first)

uvicorn app.main:app --reload --port 8000
```

## 1. Measurement service setup

```bash
cd measurement-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 9001
```

The SQLite database (`backend/shop.db`) and all 25 products are created
automatically on first startup. API docs are available at
`http://localhost:8000/docs`. This backend has **no ML dependencies** — it's
fast to install and light to run, because the measurement pipeline lives in
its own service (see below).

**If `MEASUREMENT_PIPELINE_URL` isn't set yet, or the service is
unreachable:** the app still works — `/api/measurements/estimate` falls back
to reasonable average measurements (sliders still render and are fully
adjustable), and the chat shows why.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` requests
to `http://localhost:8000`, so make sure the backend is running first.

## 3. Wiring in the measurement pipeline

Deploy the `measurement-service/` folder to a free cloud host — Hugging Face
Spaces recommended (see `measurement-service/README.md` for a full
walkthrough, plus Render/Modal alternatives). Once deployed, set in
`backend/.env`:

```
MEASUREMENT_PIPELINE_URL=https://your-space.hf.space/estimate
```

This keeps MediaPipe/OpenCV off your laptop entirely — only the cloud
service needs those. Everything upstream (the chat's live camera capture, the
inches-based sliders, the "Visualise" silhouette comparison) works without
any frontend changes once this is set.

## Notes

- Product images use placeholder photos (picsum.photos) seeded per product —
  swap `seed_data.py`'s image URLs for real product photography whenever ready.
- The "Visualise" silhouette is a stylized proportional mannequin generated
  from plain numbers, not a literal trace of a photo — that's intentional
  (it's what makes it instantly editable and directly comparable to a
  garment's silhouette), worth mentioning explicitly if asked.
- Saved measurement profiles (name + 6 numbers per person) are stored in the
  browser's `localStorage` for this demo — move them to the backend/DB if you
  need them to persist across devices or be visible to other systems.
- CORS is wide open (`allow_origins=["*"]`) for local development — restrict
  this to your real frontend origin before deploying.
