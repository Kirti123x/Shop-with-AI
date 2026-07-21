from dotenv import load_dotenv
load_dotenv()  # must run before routers read os.getenv for GROQ_API_KEY etc.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .seed_data import seed
from .routers import products, chat, measurements

app = FastAPI(title="Myntra-style AI Shopping API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(chat.router)
app.include_router(measurements.router)


@app.on_event("startup")
def on_startup():
    seed()


@app.get("/api/health")
def health():
    return {"status": "ok"}
