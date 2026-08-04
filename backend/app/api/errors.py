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
    return error_response(http_status, code, str(exc), getattr(exc, "field", None))


async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    messages = "; ".join(f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors())
    return error_response(422, "VALIDATION_ERROR", messages)


async def generic_error_handler(_request: Request, _exc: Exception) -> JSONResponse:
    return error_response(500, "INTERNAL_ERROR", "An unexpected error occurred")
