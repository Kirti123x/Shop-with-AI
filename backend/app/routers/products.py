from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..database import db_session

router = APIRouter(prefix="/api/products", tags=["products"])


def _serialize_product_row(row) -> dict:
    d = dict(row)
    d["sizes_available"] = d["sizes_available"].split(",")
    d["colors_available"] = d["colors_available"].split(",")
    return d


@router.get("")
def list_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    gender: Optional[str] = None,
    search: Optional[str] = None,
):
    query = """
        SELECT p.*, b.name AS brand_name,
               (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id) AS rating_avg,
               (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS rating_count,
               (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.id LIMIT 1) AS thumbnail
        FROM products p JOIN brands b ON b.id = p.brand_id
        WHERE 1=1
    """
    params = []
    if category:
        query += " AND p.category = ?"
        params.append(category)
    if brand:
        query += " AND b.name = ?"
        params.append(brand)
    if gender:
        query += " AND (p.gender = ? OR p.gender = 'Unisex')"
        params.append(gender)
    if search:
        query += " AND (p.name LIKE ? OR p.category LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    query += " ORDER BY p.id"

    with db_session() as conn:
        rows = conn.execute(query, params).fetchall()
        products = [dict(r) for r in rows]

    return {"count": len(products), "products": products}


@router.get("/meta/filters")
def get_filters():
    with db_session() as conn:
        categories = [r["category"] for r in conn.execute("SELECT DISTINCT category FROM products").fetchall()]
        brands = [r["name"] for r in conn.execute("SELECT DISTINCT name FROM brands").fetchall()]
    return {"categories": categories, "brands": brands}


@router.get("/{product_id}")
def get_product(product_id: int):
    with db_session() as conn:
        row = conn.execute(
            """SELECT p.*, b.name AS brand_name
               FROM products p JOIN brands b ON b.id = p.brand_id WHERE p.id = ?""",
            (product_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        images = [dict(r) for r in conn.execute(
            "SELECT id, url, alt FROM product_images WHERE product_id = ? ORDER BY id", (product_id,)
        ).fetchall()]

        reviews = [dict(r) for r in conn.execute(
            "SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC", (product_id,)
        ).fetchall()]

        orders = [dict(r) for r in conn.execute(
            "SELECT * FROM past_orders WHERE product_id = ? ORDER BY order_date DESC", (product_id,)
        ).fetchall()]

        rating_row = conn.execute(
            "SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS total FROM reviews WHERE product_id = ?",
            (product_id,),
        ).fetchone()

        # most common size ordered -> used both in UI and as chatbot context
        size_row = conn.execute(
            """SELECT size_ordered, COUNT(*) AS c FROM past_orders WHERE product_id = ?
               GROUP BY size_ordered ORDER BY c DESC LIMIT 1""",
            (product_id,),
        ).fetchone()

    product = _serialize_product_row(row)
    product["images"] = images
    product["reviews"] = reviews
    product["past_orders"] = orders
    product["rating_avg"] = rating_row["avg_rating"] or 0
    product["rating_count"] = rating_row["total"] or 0
    product["most_ordered_size"] = size_row["size_ordered"] if size_row else None

    return product
