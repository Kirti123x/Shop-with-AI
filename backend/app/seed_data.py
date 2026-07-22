"""
Seeds the DB with 25 sample products: 5 clothing categories, each available
from 5 different brands (5 x 5 = 25)[cite: 1]. Each product gets multiple images,
a handful of reviews, and a few past orders (used by the AI stylist as
context, e.g. "most buyers in your size ordered M")[cite: 1].
"""
import random
from datetime import datetime, timedelta
from .database import db_session, init_db, is_seeded

random.seed(42) #[cite: 1]

BRANDS = ["Roadster", "HRX", "Levi's", "Zara", "Puma"] #[cite: 1]

# Predefined realistic Pexels image URLs mapped to categories
PEXELS_IMAGES = {
    "T-Shirts": [
        "https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg",
        "https://images.pexels.com/photos/991509/pexels-photo-991509.jpeg",
        "https://images.pexels.com/photos/4066290/pexels-photo-4066290.jpeg",
        "https://images.pexels.com/photos/8532616/pexels-photo-8532616.jpeg",
        "https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg"
    ],
    "Jeans": [
        "https://images.pexels.com/photos/52518/jeans-pants-blue-52518.jpeg",
        "https://images.pexels.com/photos/65676/nanjing-studio-jeans-65676.jpeg",
        "https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg",
        "https://images.pexels.com/photos/4210866/pexels-photo-4210866.jpeg",
        "https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg"
    ],
    "Dresses": [
        "https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg",
        "https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg",
        "https://images.pexels.com/photos/2227832/pexels-photo-2227832.jpeg",
        "https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg",
        "https://images.pexels.com/photos/1852381/pexels-photo-1852381.jpeg"
    ],
    "Jackets": [
        "https://images.pexels.com/photos/1124465/pexels-photo-1124465.jpeg",
        "https://images.pexels.com/photos/1336873/pexels-photo-1336873.jpeg",
        "https://images.pexels.com/photos/1619651/pexels-photo-1619651.jpeg",
        "https://images.pexels.com/photos/775358/pexels-photo-775358.jpeg",
        "https://images.pexels.com/photos/316681/pexels-photo-316681.jpeg"
    ],
    "Sneakers": [
        "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg",
        "https://images.pexels.com/photos/19090/pexels-photo.jpg",
        "https://images.pexels.com/photos/1032110/pexels-photo-1032110.jpeg",
        "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg",
        "https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg"
    ]
}

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
} #[cite: 1]

ADJECTIVES = ["Classic", "Urban", "Solid", "Graphic", "Slim-Fit", "Oversized",
              "Relaxed", "Vintage", "Sport", "Everyday"] #[cite: 1]

REVIEW_TEMPLATES = [
    (5, "Loved it!", "Fits exactly as expected and the {mat} feels premium. Ordering another color."),
    (4, "Good buy", "Nice quality for the price, {mat} feels good, slightly {fit} than expected."),
    (5, "True to size", "Ordered my usual size and it fit perfectly. Fast delivery too."),
    (3, "Decent", "Material is okay, expected a bit better finishing for the price."),
    (4, "Comfortable", "Wore it all day, very comfortable. Would recommend sizing up if you like a looser fit."),
    (2, "Runs small", "Had to return and exchange for a size up, otherwise good quality."),
    (5, "Great quality", "The {mat} is durable and doesn't feel cheap at all. Worth it."),
] #[cite: 1]

FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Sneha", "Kabir", "Isha", "Vikram",
               "Ananya", "Dev", "Meera", "Arjun", "Neha", "Karan", "Divya", "Yash"] #[cite: 1]


def rand_date(days_back=180): #[cite: 1]
    d = datetime.now() - timedelta(days=random.randint(1, days_back)) #[cite: 1]
    return d.strftime("%Y-%m-%d") #[cite: 1]


def build_products(): #[cite: 1]
    products = [] #[cite: 1]
    for category, meta in CATEGORIES.items(): #[cite: 1]
        for brand in BRANDS: #[cite: 1]
            adj = random.choice(ADJECTIVES) #[cite: 1]
            name = f"{brand} {adj} {category[:-1] if category.endswith('s') else category}" #[cite: 1]
            lo, hi = meta["price_range"] #[cite: 1]
            price = random.randrange(lo, hi, 100) #[cite: 1]
            mrp = int(price * random.uniform(1.3, 1.8) // 10 * 10) #[cite: 1]
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
            }) #[cite: 1]
    return products #[cite: 1]


def seed(): #[cite: 1]
    init_db() #[cite: 1]
    if is_seeded(): #[cite: 1]
        return #[cite: 1]

    with db_session() as conn: #[cite: 1]
        brand_ids = {} #[cite: 1]
        for b in BRANDS: #[cite: 1]
            cur = conn.execute("INSERT INTO brands (name) VALUES (?)", (b,)) #[cite: 1]
            brand_ids[b] = cur.lastrowid #[cite: 1]

        category_counts = {cat: 0 for cat in CATEGORIES.keys()}
        for p in build_products(): #[cite: 1]
            cur = conn.execute(
                """INSERT INTO products
                   (brand_id, name, category, gender, price, mrp, material,
                    quality_notes, description, sizes_available, colors_available)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (brand_ids[p["brand"]], p["name"], p["category"], p["gender"],
                 p["price"], p["mrp"], p["material"], p["quality_notes"],
                 p["description"], p["sizes_available"], p["colors_available"]),
            ) #[cite: 1]
            product_id = cur.lastrowid #[cite: 1]

            # Replaced picsum.photos with Pexels URLs mapped directly to the garment category
            # One image per product using fixed Pexels images mapped to categories
            img_index = category_counts[p["category"]]
            fixed_image = PEXELS_IMAGES[p["category"]][img_index]
            
            # Increment so the next brand's garment in this category gets the next image
            category_counts[p["category"]] += 1
            
            # Pexels supports query parameters to crop and format on the fly
            image_url = f"{fixed_image}?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
            
            conn.execute(
                "INSERT INTO product_images (product_id, url, alt) VALUES (?,?,?)",
                (product_id, image_url, p["name"]),
            )

            # 3-5 reviews per product[cite: 1]
            mat_short = p["material"].split(",")[0].split("with")[0].strip().lower() #[cite: 1]
            for _ in range(random.randint(3, 5)): #[cite: 1]
                rating, title, tmpl = random.choice(REVIEW_TEMPLATES) #[cite: 1]
                comment = tmpl.format(mat=mat_short, fit=random.choice(["tighter", "looser"])) #[cite: 1]
                size = random.choice(p["sizes_available"].split(",")) #[cite: 1]
                conn.execute(
                    """INSERT INTO reviews
                       (product_id, user_name, rating, title, comment, size_bought, fit_feedback, created_at)
                       VALUES (?,?,?,?,?,?,?,?)""",
                    (product_id, random.choice(FIRST_NAMES), rating, title, comment,
                     size, random.choice(["True to size", "Runs small", "Runs large"]), rand_date()),
                ) #[cite: 1]

            # 4-8 past orders per product, used as sizing-context signal for the AI assistant[cite: 1]
            for _ in range(random.randint(4, 8)): #[cite: 1]
                size = random.choice(p["sizes_available"].split(",")) #[cite: 1]
                conn.execute(
                    """INSERT INTO past_orders (product_id, user_name, size_ordered, order_date, status)
                       VALUES (?,?,?,?,?)""",
                    (product_id, random.choice(FIRST_NAMES), size, rand_date(),
                     random.choice(["Delivered", "Delivered", "Delivered", "Exchanged", "Returned"])),
                ) #[cite: 1]


if __name__ == "__main__": #[cite: 1]
    seed() #[cite: 1]
    print("Database seeded with 25 products.") #[cite: 1]