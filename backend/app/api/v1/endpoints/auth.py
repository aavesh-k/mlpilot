import contextlib
from datetime import timedelta

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.api.v1.schemas.auth import ForgotPasswordRequest, ForgotPasswordResponse, RegisterRequest, TokenResponse, UserResponse
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.storage import storage

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest) -> TokenResponse:
    email = body.email.lower().strip()
    if storage.get_user_by_email(email):
        # Friendly, actionable — don't leak raw DB message, guide to sign in
        raise ConflictError("An account with this email already exists. Try signing in instead.")
    hashed = hash_password(body.password)
    user = storage.create_user(email=email, hashed_password=hashed)
    # Migrate guest demo data if provided — keep all 3
    if body.guest_session_id:
        with contextlib.suppress(Exception):
            storage.migrate_guest_to_user(body.guest_session_id, user["id"])
    access_token = create_access_token(
        {"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), remember_me: bool = False) -> TokenResponse:
    # OAuth2 form uses `username` field for email
    email = form_data.username.lower().strip() if form_data.username else ""
    if not email:
        raise ValidationError("Please enter your email address.", field="email")
    if not form_data.password:
        raise ValidationError("Please enter your password.", field="password")
    user = storage.get_user_by_email(email)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        # Generic but helpful — don't reveal whether email exists (prevent enumeration)
        # Frontend will map this to a friendly banner with recovery actions
        raise AuthenticationError("Incorrect email or password. Please check your credentials and try again.")
    access_token = create_access_token(
        {"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    # Remember me controls refresh token longevity: 30d if checked, 1d if not (session-like)
    refresh_exp_days = settings.REFRESH_TOKEN_EXPIRE_DAYS if remember_me else 1
    refresh_token = create_refresh_token(
        {"sub": user["id"], "email": user["email"]}, expires_days=refresh_exp_days
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=current_user["id"], email=current_user["email"], created_at=current_user["created_at"])


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest) -> ForgotPasswordResponse:
    # Always return generic success to avoid email enumeration — UX says
    # "If an account exists for this email, you'll receive a reset link shortly."
    # For now we don't actually send email; we just acknowledge.
    email = body.email.lower().strip()
    _ = storage.get_user_by_email(email)  # lookup to keep timing similar, but don't reveal
    return ForgotPasswordResponse(
        message="If an account exists for this email, you'll receive a password reset link shortly.",
        detail=(
            "Check your inbox (and spam folder). For this demo, password reset is not yet "
            "fully implemented — please try signing in again or contact support."
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str) -> TokenResponse:
    from app.core.security import decode_token

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError("Your session has expired. Please sign in again.")
    user_id = payload.get("sub")
    user = storage.get_user_by_id(user_id) if user_id else None
    if not user:
        raise AuthenticationError("Account not found. Please sign in again.")
    new_access = create_access_token(
        {"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh = create_refresh_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)
