from pydantic import BaseModel, Field


class UpdateSettingsSchema(BaseModel):
    api_endpoint: str | None = None
    default_project: str | None = None
    max_memory_gb: int | None = Field(default=None, ge=1, le=1024)
    max_runtime_minutes: int | None = Field(default=None, ge=1, le=43200)
    parallel_jobs: int | None = Field(default=None, ge=1, le=100)
    email_alerts: bool | None = None
    webhook_url: str | None = None
