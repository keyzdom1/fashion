from uuid import uuid4

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import decode_token_optional, get_current_user, require_admin
from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User, UserRole
from app.schemas.auth import (
    CategoryOut,
    ImageOut,
    ProductCreate,
    ProductListResponse,
    ProductOut,
    ProductUpdate,
)
from app.services.media import store_image

router = APIRouter(tags=["products"])


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search in name/description"),
    category: str | None = Query(None, description="Category slug"),
    min_price: float | None = None,
    max_price: float | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=500),
    include_inactive: bool = Query(False, description="Admin only: include hidden products"),
    authorization: str | None = Header(default=None),
) -> ProductListResponse:
    query = select(Product)
    if include_inactive:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Admin access required")
        payload = decode_token_optional(authorization.removeprefix("Bearer "))
        if payload is None or payload.get("type") != "access":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
        user_result = await db.execute(select(User).where(User.id == payload["sub"]))
        user = user_result.scalar_one_or_none()
        if user is None or user.role != UserRole.ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    else:
        query = query.where(Product.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Product.name.ilike(pattern), Product.description.ilike(pattern)))
    if category:
        cat = await db.execute(select(Category).where(Category.slug == category))
        cat_obj = cat.scalar_one_or_none()
        if cat_obj is None:
            return ProductListResponse(items=[], total=0, page=page, page_size=page_size)
        query = query.where(Product.category_id == cat_obj.id)
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = (
        query.options(selectinload(Product.images), selectinload(Product.variants))
        .order_by(Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = (await db.execute(query)).scalars().all()
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)) -> Product:
    result = await db.execute(
        select(Product)
        .where(or_(Product.id == product_id, Product.slug == product_id))
        .options(selectinload(Product.images), selectinload(Product.variants))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


async def _resolve_category(db: AsyncSession, category_id: str | None, category_slug: str | None) -> str | None:
    if category_slug:
        result = await db.execute(select(Category).where(Category.slug == category_slug))
        cat = result.scalar_one_or_none()
        if cat is None:
            name = category_slug.replace("-", " ").strip().title()
            cat = Category(name=name, slug=category_slug)
            db.add(cat)
            await db.flush()
        return cat.id
    return category_id


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Product:
    existing = await db.execute(select(Product).where(Product.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already exists")

    data = payload.model_dump(exclude={"image_url", "sizes", "colors", "stock_qty", "category_slug"})
    category_id = await _resolve_category(db, data.pop("category_id", None), payload.category_slug)
    product = Product(**data, category_id=category_id)
    db.add(product)
    await db.flush()

    if payload.image_url:
        db.add(ProductImage(product_id=product.id, url=payload.image_url, position=0))

    sizes = payload.sizes or ["M"]
    colors = payload.colors or ["Default"]
    for color in colors:
        for size in sizes:
            sku = f"{payload.slug[:12]}-{color[:3].upper()}-{size.replace(' ', '')}".upper()
            # ensure unique sku
            clash = await db.execute(select(ProductVariant).where(ProductVariant.sku == sku))
            if clash.scalar_one_or_none():
                sku = f"{sku}-{uuid4().hex[:4].upper()}"
            db.add(
                ProductVariant(
                    product_id=product.id,
                    size=size,
                    color=color,
                    sku=sku,
                    stock_qty=payload.stock_qty,
                )
            )

    await db.commit()
    result = await db.execute(
        select(Product)
        .where(Product.id == product.id)
        .options(selectinload(Product.images), selectinload(Product.variants))
    )
    return result.scalar_one()


@router.post("/products/{product_id}/images", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ImageOut:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")

    content_type = file.content_type or "image/jpeg"
    try:
        raw = await file.read()
        url = store_image(raw, content_type)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    pos_result = await db.execute(
        select(func.coalesce(func.max(ProductImage.position), -1)).where(
            ProductImage.product_id == product_id
        )
    )
    next_pos = (pos_result.scalar_one() or 0) + 1
    image = ProductImage(product_id=product_id, url=url, position=next_pos)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return ImageOut(url=image.url, id=image.id)


@router.post("/uploads", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> ImageOut:
    content_type = file.content_type or "image/jpeg"
    try:
        raw = await file.read()
        url = store_image(raw, content_type)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return ImageOut(url=url)


@router.delete("/products/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image(
    product_id: str,
    image_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    result = await db.execute(
        select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    )
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    await db.delete(image)
    await db.commit()


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    fields = payload.model_dump(exclude_unset=True)
    category_slug = fields.pop("category_slug", None)
    if category_slug is not None or "category_id" in fields:
        product.category_id = await _resolve_category(
            db, fields.pop("category_id", None), category_slug
        )
    for key, value in fields.items():
        setattr(product, key, value)
    await db.commit()
    await db.refresh(product)
    result = await db.execute(
        select(Product)
        .where(Product.id == product.id)
        .options(selectinload(Product.images), selectinload(Product.variants))
    )
    return result.scalar_one()


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    await db.delete(product)
    await db.commit()


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name))
    return list(result.scalars().all())
