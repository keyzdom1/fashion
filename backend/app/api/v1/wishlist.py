from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.models.order import WishlistItem
from app.schemas.auth import Message, ProductOut

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ProductOut])
async def get_wishlist(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Product]:
    result = await db.execute(
        select(Product)
        .join(WishlistItem, WishlistItem.product_id == Product.id)
        .where(WishlistItem.user_id == user.id)
        .options(selectinload(Product.images), selectinload(Product.variants))
    )
    return list(result.scalars().all())


@router.post("/{product_id}", response_model=Message, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Message:
    product = await db.execute(select(Product).where(Product.id == product_id))
    if product.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    existing = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)
    )
    if existing.scalar_one_or_none() is None:
        db.add(WishlistItem(user_id=user.id, product_id=product_id))
        await db.commit()
    return Message(detail="Added to wishlist")


@router.delete("/{product_id}", response_model=Message)
async def remove_from_wishlist(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Message:
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not in wishlist")
    await db.delete(item)
    await db.commit()
    return Message(detail="Removed from wishlist")
