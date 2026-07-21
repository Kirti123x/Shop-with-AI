"""
Seeds the DB with 25 sample products: 5 clothing categories, each available
from 5 different brands (5 x 5 = 25). Each product gets multiple images,
a handful of reviews, and a few past orders (used by the AI stylist as
context, e.g. "most buyers in your size ordered M").
"""
import random
from datetime import datetime, timedelta
from .database import db_session, init_db, is_seeded

random.seed(42)

BRANDS = ["Roadster", "HRX", "Levi's", "Zara", "Puma"]

CATEGORIES = {
    "T-Shirts": {
        "material": "100% Combed Cotton, Bio-washed",
        "quality_notes": "Breathable single-jersey knit, pre-shrunk, colorfast dye",
        "sizes": "S,M,L,XL,XXL",
        "price_range": (499, 1499),
    },
    "Jeans": {
        "material": "98% Cotton, 2% Elastane Denim",
        "quality_notes": "Stretch-fit denim, reinforced stitching, stonewash finish",
        "sizes": "28,30,32,34,36,38",
        "price_range": (1299, 3499),
    },
    "Dresses": {
        "material": "Polyester Georgette with lining",
        "quality_notes": "Flowy A-line cut, machine washable, wrinkle resistant",
        "sizes": "XS,S,M,L,XL",
        "price_range": (999, 2999),
    },
    "Jackets": {
        "material": "Polyester shell with quilted polyfill lining",
        "quality_notes": "Water-resistant outer, YKK zippers, ribbed cuffs",
        "sizes": "S,M,L,XL,XXL",
        "price_range": (1799, 4999),
    },
    "Sneakers": {
        "material": "Engineered mesh upper, EVA midsole, rubber outsole",
        "quality_notes": "Cushioned insole, breathable mesh, anti-skid sole",
        "sizes": "6,7,8,9,10,11",
        "price_range": (1999, 5999),
    },
}

ADJECTIVES = ["Classic", "Urban", "Solid", "Graphic", "Slim-Fit", "Oversized",
              "Relaxed", "Vintage", "Sport", "Everyday"]

REVIEW_TEMPLATES = [
    (5, "Loved it!", "Fits exactly as expected and the {mat} feels premium. Ordering another color."),
    (4, "Good buy", "Nice quality for the price, {mat} feels good, slightly {fit} than expected."),
    (5, "True to size", "Ordered my usual size and it fit perfectly. Fast delivery too."),
    (3, "Decent", "Material is okay, expected a bit better finishing for the price."),
    (4, "Comfortable", "Wore it all day, very comfortable. Would recommend sizing up if you like a looser fit."),
    (2, "Runs small", "Had to return and exchange for a size up, otherwise good quality."),
    (5, "Great quality", "The {mat} is durable and doesn't feel cheap at all. Worth it."),
]

FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Isha", "Vikram",
               "Ananya", "Dev", "Meera", "Arjun", "Neha", "Karan", "Divya", "Yash"]


def rand_date(days_back=180):
    d = datetime.now() - timedelta(days=random.randint(1, days_back))
    return d.strftime("%Y-%m-%d")


def build_products():
    products = []
    for category, meta in CATEGORIES.items():
        for brand in BRANDS:
            adj = random.choice(ADJECTIVES)
            name = f"{brand} {adj} {category[:-1] if category.endswith('s') else category}"
            lo, hi = meta["price_range"]
            price = random.randrange(lo, hi, 100)
            mrp = int(price * random.uniform(1.3, 1.8) // 10 * 10)
            products.append({
                "brand": brand,
                "name": name,
                "category": category,
                "gender": random.choice(["Men", "Women", "Unisex"]),
                "price": price,
                "mrp": mrp,
                "material": meta["material"],
                "quality_notes": meta["quality_notes"],
                "description": (
                    f"The {name} brings together everyday comfort and street-ready style. "
                    f"Crafted from {meta['material'].lower()}, it's built for {random.choice(['gym to street', 'work to weekend', 'all-day wear', 'travel and lounging'])} "
                    f"looks without compromising on comfort."
                ),
                "sizes_available": meta["sizes"],
                "colors_available": random.choice(["Black,White,Navy", "Grey,Maroon,Olive", "Blue,Black,Beige", "Red,Black,White"]),
            })
    return products


def seed():
    init_db()
    if is_seeded():
        return

    with db_session() as conn:
        brand_ids = {}
        for b in BRANDS:
            cur = conn.execute("INSERT INTO brands (name) VALUES (?)", (b,))
            brand_ids[b] = cur.lastrowid

        for p in build_products():
            cur = conn.execute(
                """INSERT INTO products
                   (brand_id, name, category, gender, price, mrp, material,
                    quality_notes, description, sizes_available, colors_available)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (brand_ids[p["brand"]], p["name"], p["category"], p["gender"],
                 p["price"], p["mrp"], p["material"], p["quality_notes"],
                 p["description"], p["sizes_available"], p["colors_available"]),
            )
            product_id = cur.lastrowid

            # Multiple images per product (placeholder photo service, seeded per product for consistency)
            for i in range(3):
                seed_tag = f"{p['brand']}-{p['category']}-{product_id}-{i}".replace(" ", "")
                conn.execute(
                    "INSERT INTO product_images (product_id, url, alt) VALUES (?,?,?)",
                    (product_id, f"https://picsum.photos/seed/{seed_tag}/600/750", f"{p['name']} view {i+1}"),
                )

            # 3-5 reviews per product
            mat_short = p["material"].split(",")[0].split("with")[0].strip().lower()
            for _ in range(random.randint(3, 5)):
                rating, title, tmpl = random.choice(REVIEW_TEMPLATES)
                comment = tmpl.format(mat=mat_short, fit=random.choice(["tighter", "looser"]))
                size = random.choice(p["sizes_available"].split(","))
                conn.execute(
                    """INSERT INTO reviews
                       (product_id, user_name, rating, title, comment, size_bought, fit_feedback, created_at)
                       VALUES (?,?,?,?,?,?,?,?)""",
                    (product_id, random.choice(FIRST_NAMES), rating, title, comment,
                     size, random.choice(["True to size", "Runs small", "Runs large"]), rand_date()),
                )

            # 4-8 past orders per product, used as sizing-context signal for the AI assistant
            for _ in range(random.randint(4, 8)):
                size = random.choice(p["sizes_available"].split(","))
                conn.execute(
                    """INSERT INTO past_orders (product_id, user_name, size_ordered, order_date, status)
                       VALUES (?,?,?,?,?)""",
                    (product_id, random.choice(FIRST_NAMES), size, rand_date(),
                     random.choice(["Delivered", "Delivered", "Delivered", "Exchanged", "Returned"])),
                )


if __name__ == "__main__":
    seed()
    print("Database seeded with 25 products.")
