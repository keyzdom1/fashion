import re
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)


def _origin_allowed(origin: str, allowed: list[str]) -> bool:
    if origin in allowed or "*" in allowed:
        return True
    host = urlparse(origin).hostname or ""
    patterns = [
        r"(^|\.)vercel\.app$",
        r"(^|\.)onrender\.com$",
    ]
    return any(re.search(p, host) for p in patterns)


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed = settings.CORS_ORIGINS
    if origin and _origin_allowed(origin, allowed):
        if request.method == "OPTIONS":
            from fastapi.responses import Response

            resp = Response(status_code=204)
        else:
            resp = await call_next(request)
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,X-Session-Id"
        resp.headers["Access-Control-Expose-Headers"] = "Content-Type"
        return resp
    return await call_next(request)


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
