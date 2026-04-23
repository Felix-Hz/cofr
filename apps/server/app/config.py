from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    ENCRYPTION_KEY: str
    API_PORT: int = 5784
    ENV: str = "production"

    # OAuth (Google)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Set to false to disable new account registration
    REGISTRATION_ENABLED: bool = True

    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM_ADDRESS: str = ""
    EMAIL_FROM_NAME: str = "cofr"
    RESEND_WEBHOOK_SECRET: str = ""

    # Sentry (empty = disabled)
    SENTRY_DSN: str = ""

    # AWS S3 for export file storage (empty = disabled, exports still work via temp files)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-southeast-2"
    S3_BUCKET_NAME: str = "cofr-data"

    # URLs
    API_URL: str = "http://localhost:5784"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore // BaseSettings loads .env automagically


settings = get_settings()
