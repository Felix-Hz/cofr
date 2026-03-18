from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    TELEGRAM_BOT_TOKEN: str
    TELEGRAM_BOT_NAME: str = ""
    JWT_SECRET: str
    ENCRYPTION_KEY: str
    API_PORT: int = 5784
    ENV: str = "production"

    # OAuth — Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Email — Amazon SES
    AWS_SES_ACCESS_KEY_ID: str = ""
    AWS_SES_SECRET_ACCESS_KEY: str = ""
    AWS_SES_REGION: str = "ap-southeast-2"
    EMAIL_FROM_ADDRESS: str = "hello@cofr.cash"
    EMAIL_FROM_NAME: str = "Cofr"
    SNS_WEBHOOK_SECRET: str = ""

    # URLs
    API_URL: str = "http://localhost:5784"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore // BaseSettings loads .env automagically


settings = get_settings()
