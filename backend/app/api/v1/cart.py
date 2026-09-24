from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import decode_token_optional
from app.db.session import get_db
from app.models.order import Cart, CartItem
from app.models.product import Product, ProductVariant
from app.models.user import User
from app.schemas.auth import CartItemCreate, CartOut

router = APIRouter(prefix="/cart", tags=["cart"])


async def _resolve_user(db: AsyncSession, authorization: str | None) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token_optional(authorization.removeprefix("Bearer "))
    if payload is None or payload.get("type") != "access":
        return None
    result = await db.execute(select(User).where(User.id == payload.get("sub")))
    return result.scalar_one_or_none()


async def _get_or_create_cart(db: AsyncSession, user: User | None, x_session_id: str | None) -> Cart:
    if user:
        result = await db.execute(select(Cart).where(Cart.user_id == user.id))
        cart = result.scalar_one_or_none()
        if cart is None and x_session_id:
            session_result = await db.execute(
                select(Cart).where(Cart.session_id == x_session_id, Cart.user_id.is_(None))
            )
            session_cart = session_result.scalar_one_or_none()
            if session_cart:
                session_cart.user_id = user.id
                await db.commit()
                return session_cart
        if cart is None:
            cart = Cart(user_id=user.id)
            db.add(cart)
            await db.commit()
            await db.refresh(cart)
        return cart

    if not x_session_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "X-Session-Id header required for guest cart")
    result = await db.execute(select(Cart).where(Cart.session_id == x_session_id))
    cart = result.scalar_one_or_none()
    if cart is None:
        cart = Cart(session_id=x_session_id)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)
    return cart


async def _load_variant(db: AsyncSession, variant_id: str) -> ProductVariant:
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.id == variant_id)
        .options(
            selectinload(ProductVariant.product).selectinload(Product.images)
        )
    )
    variant = result.scalar_one_or_none()
    if variant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Variant not found")
    return variant


async def _cart_out(db: AsyncSession, cart: Cart) -> CartOut:
    result = await db.execute(
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .options(
            selectinload(CartItem.product_variant)
            .selectinload(ProductVariant.product)
            .selectinload(Product.images)
        ),
    )
    items = list(result.scalars().all())
    out_items = []
    total = Decimal("0.00")
    count = 0
    for item in items:
        variant = item.product_variant
        product = variant.product if variant else None
        price = (product.price if product else Decimal("0")) + (
            variant.price_adjustment if variant else Decimal("0")
        )
        image_url = product.images[0].url if product and product.images else None
        total += price * item.qty
        count += item.qty
        out_items.append(
            {
                "id": item.id,
                "product_variant_id": item.product_variant_id,
                "qty": item.qty,
                "product_name": product.name if product else "Unknown",
                "size": variant.size if variant else None,
                "color": variant.color if variant else None,
                "price": price,
                "image_url": image_url,
                "stock_qty": variant.stock_qty if variant else 0,
            }
        )
    return CartOut(id=cart.id, items=out_items, total=total, item_count=count)


@router.get("", response_model=CartOut)
async def get_cart(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
) -> CartOut:
    user = await _resolve_user(db, authorization)
    cart = await _get_or_create_cart(db, user, x_session_id)
    return await _cart_out(db, cart)


@router.post("/items", response_model=CartOut)
async def add_item(
    payload: CartItemCreate,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
) -> CartOut:
    user = await _resolve_user(db, authorization)
    cart = await _get_or_create_cart(db, user, x_session_id)
    variant = await _load_variant(db, payload.product_variant_id)

    result = await db.execute(
        select(CartItem).where(
            CartItem.cart_id == cart.id, CartItem.product_variant_id == payload.product_variant_id
        )
    )
    existing = result.scalar_one_or_none()
    new_qty = (existing.qty if existing else 0) + payload.qty
    if new_qty > variant.stock_qty:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
    if existing:
        existing.qty = new_qty
    else:
        db.add(CartItem(cart_id=cart.id, product_variant_id=payload.product_variant_id, qty=payload.qty))
    await db.commit()
    return await _cart_out(db, cart)


@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
) -> CartOut:
    user = await _resolve_user(db, authorization)
    cart = await _get_or_create_cart(db, user, x_session_id)
    result = await db.execute(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cart item not found")
    await db.delete(item)
    await db.commit()
    return await _cart_out(db, cart)
