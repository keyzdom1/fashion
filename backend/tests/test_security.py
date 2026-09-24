import pytest
from app.core.security import create_access_token, decode_token, hash_password, verify_password


def test_password_hash_roundtrip():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip():
    token = create_access_token("user-123")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_invalid_token_returns_none():
    assert decode_token("garbage.token.here") is None
