from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Blockchain — graceful defaults so server starts without Ganache
    GANACHE_RPC_URL: str = "http://127.0.0.1:7545"
    GANACHE_PRIVATE_KEY: str = "0x0000000000000000000000000000000000000000000000000000000000000001"
    ECHO_LOGGER_CONTRACT_ADDRESS: str = "0x0000000000000000000000000000000000000000"

    # App
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
