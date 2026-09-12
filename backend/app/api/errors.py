import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    MLBackendError,
    NotFoundError,
    StorageError,
    ValidationError,
)

logger = logging.getLogger(__name__)


def error_response(status_code: int, code: str, message: str, field: str | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "field": field}},
    )


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    mapping = {
        NotFoundError: (404, "NOT_FOUND"),
        ValidationError: (422, "VALIDATION_ERROR"),
        AuthenticationError: (401, "AUTHENTICATION_ERROR"),
        AuthorizationError: (403, "AUTHORIZATION_ERROR"),
        StorageError: (500, "STORAGE_ERROR"),
        MLBackendError: (500, "ML_BACKEND_ERROR"),
        ConflictError: (409, "CONFLICT"),
    }
    http_status, code = mapping.get(type(exc), (500, "INTERNAL_ERROR"))
    # Server-level errors should always be recorded so they are debuggable.
    if http_status >= 500:
        logger.exception("Unhandled application error: %s", exc)
    return error_response(http_status, code, str(exc), getattr(exc, "field", None))


def _friendly_validation_message(err: dict) -> tuple[str, str | None]:
    loc = err.get("loc", [])
    # loc like ('body', 'email') or ('body', 'password')
    field = None
    if len(loc) >= 2:
        field = str(loc[-1])
    elif len(loc) == 1 and str(loc[0]) != "body":
        field = str(loc[0])
    msg = err.get("msg", "Invalid value")
    # Map raw pydantic messages to friendly UX copy
    raw = msg.lower()
    # OAuth2 login uses `username` for email — map to email field for UX
    if field == "username":
        field = "email"
    if field == "email":
        if "value is not a valid email" in raw or "email" in raw:
            return "Please enter a valid email address (e.g. you@example.com).", field
        if "field required" in raw:
            return "Please enter your email address.", field
        if "username is required" in raw:
            return "Please enter your email address.", field
    if field == "password":
        if "at least 8" in raw:
            return "Password must be at least 8 characters.", field
        if "uppercase" in raw:
            return "Password must contain at least one uppercase letter.", field
        if "number" in raw or "digit" in raw:
            return "Password must contain at least one number.", field
        if "field required" in raw:
            return "Password is required.", field
        if "string too short" in raw:
            return "Password is too short.", field
    if "field required" in raw and field:
        return f"{field.capitalize()} is required.", field
    # Fallback: strip "Value error, " prefix pydantic adds
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, ") :]
    return msg, field


async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    errs = exc.errors()
    if not errs:
        return error_response(422, "VALIDATION_ERROR", "Please check your input and try again.")
    first = errs[0]
    friendly, field = _friendly_validation_message(first)
    # If multiple errors, join with "; "
    if len(errs) > 1:
        more = []
        for e in errs[1:]:
            m, _ = _friendly_validation_message(e)
            more.append(m)
        friendly = friendly + ("; " + "; ".join(more) if more else "")
    return error_response(422, "VALIDATION_ERROR", friendly, field)


async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    # Log the actual exception so unexpected 500s are never silently lost.
    logger.exception("Unhandled exception: %s", exc)
    return error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")
