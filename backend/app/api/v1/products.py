from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User
from app.schemas.auth import CategoryOut, ProductCreate, ProductListResponse, ProductOut, ProductUpdate

router = APIRouter(tags=["products"])


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    db: AsyncSession = Depends(get_db),
    q: str | None = Query(None, description="Search in name/description"),
    category: str | None = Query(None, description="Category slug"),
    min_price: float | None = None,
    max_price: float | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
) -> ProductListResponse:
    query = select(Product).where(Product.is_active.is_(True))
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


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Product:
    existing = await db.execute(select(Product).where(Product.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Slug already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


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
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    await db.commit()
    await db.refresh(product)
    return product


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
