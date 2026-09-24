import base64
import io
import uuid

from app.core.config import settings

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024


def _cloudinary_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def store_image(file_bytes: bytes, content_type: str) -> str:
    """Return a URL (or data URI) for the uploaded image."""
    if content_type not in ALLOWED_TYPES:
        raise ValueError("Only JPEG, PNG, WebP, or GIF images are allowed")
    if len(file_bytes) > MAX_BYTES:
        raise ValueError("Image must be 5MB or smaller")
    if not file_bytes:
        raise ValueError("Empty file")

    if _cloudinary_configured():
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )
        result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            folder="fashion/products",
            resource_type="image",
        )
        return result["secure_url"]

    # Fallback: store as data URI in DB (fine for demo / small images)
    b64 = base64.b64encode(file_bytes).decode("ascii")
    return f"data:{content_type};base64,{b64}"


def make_public_id() -> str:
    return uuid.uuid4().hex
