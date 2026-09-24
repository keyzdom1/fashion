from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str | None
    role: str
    created_at: datetime


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    parent_id: str | None


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    position: int


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    size: str | None
    color: str | None
    sku: str
    stock_qty: int
    price_adjustment: Decimal


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: str
    price: Decimal
    category_id: str | None
    is_active: bool
    images: list[ProductImageOut] = []
    variants: list[ProductVariantOut] = []


class ProductCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    price: Decimal
    category_id: str | None = None
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category_id: str | None = None
    is_active: bool | None = None


class ProductListResponse(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int


class CartItemCreate(BaseModel):
    product_variant_id: str
    qty: int = Field(default=1, ge=1)


class CartItemOut(BaseModel):
    id: str
    product_variant_id: str
    qty: int
    product_name: str
    size: str | None
    color: str | None
    price: Decimal
    image_url: str | None
    stock_qty: int


class CartOut(BaseModel):
    id: str
    items: list[CartItemOut]
    total: Decimal
    item_count: int


class ShippingInfo(BaseModel):
    email: str
    full_name: str
    line1: str
    line2: str | None = None
    city: str
    postal_code: str
    country: str


class OrderItemOut(BaseModel):
    id: str
    product_variant_id: str
    qty: int
    price: Decimal
    product_name: str
    size: str | None
    color: str | None


class OrderOut(BaseModel):
    id: str
    status: str
    total: Decimal
    email: str | None
    stripe_payment_id: str | None
    created_at: datetime
    items: list[OrderItemOut]


class CheckoutRequest(BaseModel):
    shipping: ShippingInfo


class CheckoutResponse(BaseModel):
    order_id: str
    checkout_url: str | None = None
    client_secret: str | None = None


class Message(BaseModel):
    detail: str
