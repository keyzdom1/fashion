from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import decode_token_optional, get_current_user, require_admin
from app.db.session import get_db
from app.models.order import Cart, CartItem, Order, OrderItem
from app.models.product import ProductVariant
from app.models.user import User
from app.schemas.auth import CheckoutRequest, CheckoutResponse, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])

try:
    import stripe

    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
except ImportError:
    stripe = None


async def _resolve_user(db: AsyncSession, authorization: str | None) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_token_optional(authorization.removeprefix("Bearer "))
    if payload is None or payload.get("type") != "access":
        return None
    result = await db.execute(select(User).where(User.id == payload.get("sub")))
    return result.scalar_one_or_none()


async def _order_out(db: AsyncSession, order: Order) -> OrderOut:
    result = await db.execute(
        select(OrderItem)
        .where(OrderItem.order_id == order.id)
        .options(selectinload(OrderItem.product_variant).selectinload(ProductVariant.product))
    )
    items = list(result.scalars().all())
    out_items = []
    for item in items:
        variant = item.product_variant
        product = variant.product if variant else None
        out_items.append(
            {
                "id": item.id,
                "product_variant_id": item.product_variant_id,
                "qty": item.qty,
                "price": item.price,
                "product_name": product.name if product else "Unknown",
                "size": variant.size if variant else None,
                "color": variant.color if variant else None,
            }
        )
    return OrderOut(
        id=order.id,
        status=order.status,
        total=order.total,
        email=order.email,
        stripe_payment_id=order.stripe_payment_id,
        created_at=order.created_at,
        items=out_items,
    )


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_session_id: str | None = Header(default=None),
) -> CheckoutResponse:
    user = await _resolve_user(db, authorization)

    if user:
        cart_result = await db.execute(select(Cart).where(Cart.user_id == user.id))
    elif x_session_id:
        cart_result = await db.execute(select(Cart).where(Cart.session_id == x_session_id))
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No cart session")
    cart = cart_result.scalar_one_or_none()
    if cart is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cart is empty")

    items_result = await db.execute(
        select(CartItem)
        .where(CartItem.cart_id == cart.id)
        .options(selectinload(CartItem.product_variant).selectinload(ProductVariant.product))
    )
    cart_items = list(items_result.scalars().all())
    if not cart_items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cart is empty")

    total = Decimal("0.00")
    order_items_data = []
    for item in cart_items:
        variant = item.product_variant
        if variant.stock_qty < item.qty:
            product = variant.product
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Insufficient stock for {product.name if product else variant.sku}",
            )
        product = variant.product
        price = product.price + variant.price_adjustment
        total += price * item.qty
        order_items_data.append({"variant": variant, "qty": item.qty, "price": price})

    order = Order(
        user_id=user.id if user else None,
        status="pending",
        total=total,
        email=payload.shipping.email,
    )
    db.add(order)
    await db.flush()

    for data in order_items_data:
        db.add(
            OrderItem(
                order_id=order.id,
                product_variant_id=data["variant"].id,
                qty=data["qty"],
                price=data["price"],
            )
        )
        data["variant"].stock_qty -= data["qty"]

    for item in cart_items:
        await db.delete(item)

    checkout_url = None
    client_secret = None
    if stripe and settings.STRIPE_SECRET_KEY:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(total * 100),
                currency="usd",
                metadata={"order_id": order.id},
                receipt_email=payload.shipping.email,
            )
            order.stripe_payment_id = intent.id
            client_secret = intent.client_secret
        except Exception:
            order.status = "pending_payment"

    await db.commit()
    await db.refresh(order)
    return CheckoutResponse(order_id=order.id, checkout_url=checkout_url, client_secret=client_secret)


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> list[OrderOut]:
    user = await _resolve_user(db, authorization)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    result = await db.execute(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()))
    orders = list(result.scalars().all())
    return [await _order_out(db, o) for o in orders]


@router.get("/all", response_model=list[OrderOut])
async def list_all_orders(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[OrderOut]:
    result = await db.execute(select(Order).order_by(Order.created_at.desc()))
    orders = list(result.scalars().all())
    return [await _order_out(db, o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> OrderOut:
    user = await _resolve_user(db, authorization)
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if user is None or (order.user_id and order.user_id != user.id):
        if user is None or user.role.value != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")
    return await _order_out(db, order)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    status_value: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> OrderOut:
    allowed = {"pending", "processing", "shipped", "delivered", "cancelled"}
    if status_value not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Status must be one of {allowed}")
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    order.status = status_value
    await db.commit()
    await db.refresh(order)
    return await _order_out(db, order)
