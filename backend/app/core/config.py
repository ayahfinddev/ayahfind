"""Application configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_ROOT = Path(__file__).resolve().parents[3]


def _resolve_repo_root() -> Path:
    import os

    override = os.environ.get("AYAHFIND_ROOT", "").strip()
    if override:
        return Path(override).resolve()
    return _DEFAULT_ROOT


REPO_ROOT = _resolve_repo_root()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AyahFind"
    debug: bool = True
    api_prefix: str = "/api/v1"

    # "development" | "production" — used to refuse serving fixture tafsir
    # content in production even if TAFSIR_ENABLED=true (see tafsir_store.py).
    environment: str = "development"

    database_url: str = Field(
        default_factory=lambda: f"sqlite+aiosqlite:///{(REPO_ROOT / 'data' / 'ayahfind.db').as_posix()}"
    )
    redis_url: str = "redis://localhost:6379/0"

    opensearch_url: str = "http://localhost:9200"
    opensearch_index: str = "ayahs"
    opensearch_enabled: bool = False

    data_dir: Path = Field(default_factory=lambda: REPO_ROOT / "data")
    raw_dir: Path = Field(default_factory=lambda: REPO_ROOT / "data" / "raw")
    processed_dir: Path = Field(default_factory=lambda: REPO_ROOT / "data" / "processed")
    vector_index_dir: Path = Field(default_factory=lambda: REPO_ROOT / "vector_index")
    audio_dir: Path = Field(default_factory=lambda: REPO_ROOT / "data" / "audio")
    mfcc_index_path: Path = Field(default_factory=lambda: REPO_ROOT / "vector_index" / "mfcc_bank.npz")

    # Tafsir: off by default. In production (environment=="production"),
    # tafsir is served live from the Quran Foundation Content API with a
    # bounded in-memory cache — no committed database (see qf_tafsir_provider.py
    # and docs/TAFSIR_INGESTION.md). In development/tests, a local fixture
    # sqlite db is used instead (tafsir_db_path, see tafsir_store.py).
    tafsir_enabled: bool = False
    tafsir_db_path: Path = Field(default_factory=lambda: REPO_ROOT / "data" / "tafsir.db")

    # Quran Foundation Content API (production tafsir source). Credentials
    # are backend-only — never sent to or read by the frontend.
    qf_client_id: str = ""
    qf_client_secret: str = ""
    qf_env: str = "production"  # "production" | "prelive" — selects the QF host pair
    qf_request_timeout_seconds: float = 10.0

    # Individual tafsir responses are cached in-memory for less than QF's
    # 7-day cap (see docs/TAFSIR_INGESTION.md for the compliance rationale).
    tafsir_cache_ttl_seconds: float = 6 * 24 * 3600
    tafsir_cache_max_entries: int = 300  # 114 surahs x 2 approved sources, with headroom

    # JSON corpus is the default for beta deploys (no Postgres required).
    use_database: bool = False
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    weight_phonetic: float = 0.40
    weight_semantic: float = 0.35
    weight_lexical: float = 0.15
    weight_audio: float = 0.10

    search_top_k_retrieve: int = 50
    search_default_top_k: int = 5
    search_timeout_seconds: float = 25.0
    search_max_query_length: int = 500

    # Arabic in-memory lexical (Render-safe limits; no full 6k combine scan).
    arabic_lexical_prefilter_limit: int = 180
    arabic_lexical_augment_cap: int = 40
    arabic_lexical_ms_budget: float = 800.0

    cors_allow_origins: str = (
        "https://ayahfind.com,https://www.ayahfind.com,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    @property
    def cors_origins(self) -> list[str]:
        raw = (self.cors_allow_origins or "").strip()
        if not raw or raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
