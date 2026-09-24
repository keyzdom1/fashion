"""Seed database with sample categories and products."""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User, UserRole
from app.core.security import hash_password

CATEGORIES = [
    {"name": "Dresses", "slug": "dresses"},
    {"name": "Tops", "slug": "tops"},
    {"name": "Bottoms", "slug": "bottoms"},
    {"name": "Outerwear", "slug": "outerwear"},
    {"name": "Accessories", "slug": "accessories"},
]

PRODUCTS = [
    {
        "name": "Midnight Velvet Midi Dress",
        "slug": "midnight-velvet-midi-dress",
        "description": "A luxurious velvet midi dress in deep midnight navy. Perfect for evening events.",
        "price": Decimal("129.00"),
        "category": "dresses",
        "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
        "colors": ["Navy", "Black"],
        "sizes": ["XS", "S", "M", "L", "XL"],
    },
    {
        "name": "Coral Pop Wrap Blouse",
        "slug": "coral-pop-wrap-blouse",
        "description": "Vibrant coral wrap blouse with a flattering silhouette. A statement piece.",
        "price": Decimal("69.00"),
        "category": "tops",
        "image": "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800",
        "colors": ["Coral", "White"],
        "sizes": ["XS", "S", "M", "L"],
    },
    {
        "name": "Sunflower Gold Pleated Skirt",
        "slug": "sunflower-gold-pleated-skirt",
        "description": "Flowing pleated skirt in radiant sunflower gold. Catches the light beautifully.",
        "price": Decimal("89.00"),
        "category": "bottoms",
        "image": "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800",
        "colors": ["Gold"],
        "sizes": ["XS", "S", "M", "L", "XL"],
    },
    {
        "name": "Soft Lilac Oversized Blazer",
        "slug": "soft-lilac-oversized-blazer",
        "description": "Trend-forward oversized blazer in dreamy soft lilac. Layer it over anything.",
        "price": Decimal("149.00"),
        "category": "outerwear",
        "image": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
        "colors": ["Lilac"],
        "sizes": ["S", "M", "L"],
    },
    {
        "name": "Blush Satin Slip Dress",
        "slug": "blush-satin-slip-dress",
        "description": "Elegant satin slip dress in soft blush. Minimalist and chic.",
        "price": Decimal("99.00"),
        "category": "dresses",
        "image": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800",
        "colors": ["Blush", "Ivory"],
        "sizes": ["XS", "S", "M", "L"],
    },
    {
        "name": "Navy Structured Tote",
        "slug": "navy-structured-tote",
        "description": "Structured leather-look tote in midnight navy. Roomy enough for everyday.",
        "price": Decimal("79.00"),
        "category": "accessories",
        "image": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
        "colors": ["Navy"],
        "sizes": ["One Size"],
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Product).limit(1))
        if existing.scalar_one_or_none():
            print("Database already seeded, skipping.")
            return

        cat_map = {}
        for c in CATEGORIES:
            cat = Category(**c)
            db.add(cat)
            cat_map[c["slug"]] = cat
        await db.flush()

        for p in PRODUCTS:
            product = Product(
                name=p["name"],
                slug=p["slug"],
                description=p["description"],
                price=p["price"],
                category_id=cat_map[p["category"]].id,
            )
            db.add(product)
            await db.flush()
            db.add(ProductImage(product_id=product.id, url=p["image"], position=0))
            for color in p["colors"]:
                for size in p["sizes"]:
                    sku = f"{p['slug'][:12]}-{color[:3].upper()}-{size.replace(' ', '')}"
                    db.add(
                        ProductVariant(
                            product_id=product.id,
                            size=size,
                            color=color,
                            sku=sku,
                            stock_qty=25,
                        )
                    )

        for email, password, name in [
            ("donworldwider2@gmail.com", "lapTOP1", "Store Admin"),
            ("admin@fashion.test", "Admin123!", "Store Admin"),
        ]:
            admin = await db.execute(select(User).where(User.email == email))
            if admin.scalar_one_or_none() is None:
                db.add(
                    User(
                        email=email,
                        hashed_password=hash_password(password),
                        full_name=name,
                        role=UserRole.ADMIN,
                    )
                )

        await db.commit()
        print("Seed complete: 5 categories, 6 products, 2 admins")


if __name__ == "__main__":
    asyncio.run(seed())
