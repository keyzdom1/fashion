from pydantic_settings import BaseSettings


def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if "sslmode=" in url:
        base = url.split("?sslmode=")[0].split("&sslmode=")[0]
        sep = "?" if "?" not in base else "&"
        url = f"{base}{sep}ssl=require"
    return url


class Settings(BaseSettings):
    PROJECT_NAME: str = "Fashion E-Commerce API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/fashion_dev"

    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@example.com"

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
settings.DATABASE_URL = _normalize_db_url(settings.DATABASE_URL)
