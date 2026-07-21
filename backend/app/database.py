"""
SQLite connection + schema. Uses stdlib sqlite3 so there is zero extra
dependency footprint for the DB layer.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).resolve().parent.parent / "shop.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    logo_emoji TEXT DEFAULT '\U0001F3F7'
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL REFERENCES brands(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'Unisex',
    price INTEGER NOT NULL,
    mrp INTEGER NOT NULL,
    material TEXT NOT NULL,
    quality_notes TEXT NOT NULL,
    description TEXT NOT NULL,
    sizes_available TEXT NOT NULL,
    colors_available TEXT NOT NULL DEFAULT 'Multi'
);

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    url TEXT NOT NULL,
    alt TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    title TEXT NOT NULL,
    comment TEXT NOT NULL,
    size_bought TEXT,
    fit_feedback TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS past_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_name TEXT NOT NULL,
    size_ordered TEXT NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Delivered'
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    product_id INTEGER,
    created_at TEXT NOT NULL
);
"""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db_session() as conn:
        conn.executescript(SCHEMA)


def is_seeded() -> bool:
    with db_session() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM products").fetchone()
        return row["c"] > 0
