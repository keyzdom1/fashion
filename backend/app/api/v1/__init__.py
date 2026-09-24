from fastapi import APIRouter

from app.api.v1 import auth, cart, orders, products, webhooks, wishlist

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(webhooks.router)
api_router.include_router(wishlist.router)
