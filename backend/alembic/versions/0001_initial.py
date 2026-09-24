"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", sa.Enum("CUSTOMER", "ADMIN", name="userrole"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("parent_id", sa.String(36), sa.ForeignKey("categories.id")),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id"), index=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "product_variants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("size", sa.String(20)),
        sa.Column("color", sa.String(50)),
        sa.Column("sku", sa.String(100), unique=True, nullable=False),
        sa.Column("stock_qty", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_adjustment", sa.Numeric(10, 2), server_default="0"),
    )

    op.create_table(
        "product_images",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("position", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "carts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True),
        sa.Column("session_id", sa.String(64), index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "cart_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("cart_id", sa.String(36), sa.ForeignKey("carts.id"), nullable=False, index=True),
        sa.Column("product_variant_id", sa.String(36), sa.ForeignKey("product_variants.id"), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False, server_default="1"),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True),
        sa.Column("status", sa.String(30), server_default="pending", index=True),
        sa.Column("total", sa.Numeric(10, 2), server_default="0"),
        sa.Column("stripe_payment_id", sa.String(255)),
        sa.Column("email", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "order_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("order_id", sa.String(36), sa.ForeignKey("orders.id"), nullable=False, index=True),
        sa.Column("product_variant_id", sa.String(36), sa.ForeignKey("product_variants.id")),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
    )

    op.create_table(
        "addresses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), index=True),
        sa.Column("line1", sa.String(255), nullable=False),
        sa.Column("line2", sa.String(255)),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("postal_code", sa.String(20), nullable=False),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false()),
    )

    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_search ON products "
        "USING gin(to_tsvector('english', name || ' ' || description))"
    )


def downgrade() -> None:
    op.drop_table("wishlist_items")
    op.drop_table("addresses")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("cart_items")
    op.drop_table("carts")
    op.drop_table("product_images")
    op.drop_table("product_variants")
    op.drop_table("products")
    op.drop_table("categories")
    op.drop_table("users")
