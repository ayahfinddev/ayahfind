"""Index ayahs into OpenSearch with Arabic-friendly analyzers."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from app.core.config import get_settings


def get_client(settings=None):
    from opensearchpy import OpenSearch

    s = settings or get_settings()
    return OpenSearch(
        hosts=[s.opensearch_url],
        use_ssl=False,
        verify_certs=False,
        ssl_show_warn=False,
    )


INDEX_BODY = {
    "settings": {
        "analysis": {
            "analyzer": {
                "arabic_ayah": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "arabic_normalization", "decimal_digit"],
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "ayah_id": {"type": "integer"},
            "surah": {"type": "integer"},
            "ayah": {"type": "integer"},
            "text_ar": {"type": "text", "analyzer": "arabic_ayah"},
            "translation_en": {"type": "text", "analyzer": "english"},
            "transliteration": {"type": "text", "analyzer": "english"},
            "phonetic_latin": {"type": "text"},
        }
    },
}


def index_opensearch(processed_path: Path) -> int:
    settings = get_settings()
    if not settings.opensearch_enabled:
        print("OpenSearch disabled")
        return 0
    client = get_client(settings)
    idx = settings.opensearch_index
    if client.indices.exists(index=idx):
        client.indices.delete(index=idx)
    client.indices.create(index=idx, body=INDEX_BODY)

    data = json.loads(processed_path.read_text(encoding="utf-8"))
    bulk: list[dict] = []
    for row in data["ayahs"]:
        bulk.append({"index": {"_index": idx, "_id": row["id"]}})
        bulk.append(
            {
                "ayah_id": row["id"],
                "surah": row["surah_number"],
                "ayah": row["ayah_number"],
                "text_ar": row["text_ar"],
                "translation_en": row.get("translation_en", ""),
                "transliteration": row.get("transliteration", ""),
                "phonetic_latin": row.get("phonetic_latin", ""),
            }
        )
    if not bulk:
        return 0
    from opensearchpy import helpers

    helpers.bulk(client, bulk, refresh=True)
    print(f"OpenSearch indexed {len(data['ayahs'])} ayahs")
    return len(data["ayahs"])
