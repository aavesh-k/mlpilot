class AppError(Exception):
    pass


class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: str) -> None:
        self.entity = entity
        self.entity_id = entity_id
        super().__init__(f"{entity} with id {entity_id} not found")


class ValidationError(AppError):
    def __init__(self, message: str, field: str | None = None) -> None:
        self.field = field
        super().__init__(message)


class AuthenticationError(AppError):
    pass


class AuthorizationError(AppError):
    pass


class StorageError(AppError):
    pass


class MLBackendError(AppError):
    pass


class ConflictError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
