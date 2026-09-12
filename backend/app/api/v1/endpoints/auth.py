from datetime import timedelta

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import RegisterRequest, TokenResponse, UserResponse
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.storage import storage

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest) -> TokenResponse:
    email = body.email.lower().strip()
    if storage.get_user_by_email(email):
        raise ConflictError(f"Email {email} already registered")
    hashed = hash_password(body.password)
    user = storage.create_user(email=email, hashed_password=hashed)
    access_token = create_access_token({"sub": user["id"], "email": user["email"]}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_refresh_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    # OAuth2 form uses `username` field for email
    email = form_data.username.lower().strip() if form_data.username else ""
    if not email:
        raise ValidationError("Email is required")
    user = storage.get_user_by_email(email)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise AuthenticationError("Invalid email or password")
    access_token = create_access_token({"sub": user["id"], "email": user["email"]}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_refresh_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user["id"], email=current_user["email"], created_at=current_user["created_at"])


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str) -> TokenResponse:
    from app.core.security import decode_token

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError("Invalid refresh token")
    user_id = payload.get("sub")
    user = storage.get_user_by_id(user_id) if user_id else None
    if not user:
        raise AuthenticationError("User not found")
    new_access = create_access_token({"sub": user["id"], "email": user["email"]}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    new_refresh = create_refresh_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)
