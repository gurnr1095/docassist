from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Mistral LLM
    mistral_api_key: str = ""
    mistral_base_url: str = "https://api.mistral.ai/v1"
    llm_model: str = "mistral-small-latest"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_db"

    # Chunking
    max_chunk_size: int = 800
    chunk_overlap: int = 100
    top_k_results: int = 5

    # Upload
    upload_dir: str = "./uploads"
    max_upload_bytes: int = 52_428_800  # 50 MB

    # Server
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    log_level: str = "INFO"

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: object) -> object:
        # Accept a comma-separated string from env vars
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    def validate_on_startup(self) -> None:
        if not self.mistral_api_key:
            raise ValueError("MISTRAL_API_KEY must be set in your .env file")
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
        Path(self.chroma_persist_dir).mkdir(parents=True, exist_ok=True)


settings = Settings()
