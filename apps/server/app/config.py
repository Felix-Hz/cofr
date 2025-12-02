from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    TURSO_DATABASE_URL: str
    TURSO_AUTH_TOKEN: str
    TELEGRAM_BOT_TOKEN: str
    JWT_SECRET: str
    API_PORT: int = 5784
    ENV: str = "production"

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore // BaseSettings loads .env automagically


settings = get_settings()
