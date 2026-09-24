from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.order import Order

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    event = None
    if settings.STRIPE_SECRET_KEY and settings.STRIPE_WEBHOOK_SECRET:
        try:
            import stripe

            event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
        except Exception:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature")
    else:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe not configured")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        if order_id:
            result = await db.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = "processing"
                order.stripe_payment_id = intent.get("id", order.stripe_payment_id)
                await db.commit()
    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        if order_id:
            result = await db.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            if order:
                order.status = "payment_failed"
                await db.commit()

    return {"received": True}
