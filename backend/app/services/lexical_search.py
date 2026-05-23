"""OpenSearch lexical retrieval with in-memory fallback."""

from __future__ import annotations

import json
from pathlib import Path

from app.core.arabic_text import normalize_arabic
from app.core.config import Settings, get_settings
from app.core.phonetic import detect_script


class LexicalSearchEngine:
    _cached_rows: list[dict] | None = None

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = None
        self._available: bool | None = None

    def _get_client(self):
        if self._client is None:
            from data_pipeline.index_opensearch import get_client

            self._client = get_client(self._settings)
        return self._client

    def _opensearch_up(self) -> bool:
        if self._available is not None:
            return self._available
        if not self._settings.opensearch_enabled:
            self._available = False
            return False
        try:
            self._get_client().cluster.health(request_timeout=0.4)
            self._available = True
        except Exception:
            self._available = False
        return self._available

    @classmethod
    def _rows(cls, settings: Settings) -> list[dict]:
        if cls._cached_rows is not None:
            return cls._cached_rows
        path = settings.processed_dir / "ayahs_processed.json"
        if not path.exists():
            cls._cached_rows = []
            return cls._cached_rows
        data = json.loads(path.read_text(encoding="utf-8"))
        cls._cached_rows = data.get("ayahs", [])
        return cls._cached_rows

    def search(self, query: str, top_k: int = 50) -> list[tuple[int, float]]:
        if self._opensearch_up():
            return self._search_opensearch(query, top_k)
        return self._search_fallback(query, top_k)

    def _search_opensearch(self, query: str, top_k: int) -> list[tuple[int, float]]:
        body = {
            "size": top_k,
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["text_ar^3", "translation_en^2", "transliteration", "phonetic_latin"],
                    "type": "best_fields",
                    "fuzziness": "AUTO",
                }
            },
        }
        res = self._get_client().search(index=self._settings.opensearch_index, body=body)
        hits: list[tuple[int, float]] = []
        max_score = res["hits"]["max_score"] or 1.0
        for h in res["hits"]["hits"]:
            aid = h["_source"]["ayah_id"]
            score = (h["_score"] or 0.0) / max_score
            hits.append((aid, min(1.0, score)))
        return hits

    def _search_fallback(self, query: str, top_k: int) -> list[tuple[int, float]]:
        from rapidfuzz import fuzz

        rows = self._rows(self._settings)
        if not rows:
            return []

        if detect_script(query) == "arabic":
            return self._search_arabic(query, rows, top_k)

        scores: list[tuple[int, float]] = []
        q = query.lower()
        for row in rows:
            best = 0.0
            for field in (
                "translation_en",
                "transliteration",
                "phonetic_latin",
                "text_ar",
            ):
                text = row.get(field) or ""
                if not text:
                    continue
                if q in text.lower():
                    best = max(best, 0.95)
                else:
                    best = max(best, fuzz.partial_ratio(q, text.lower()) / 100.0)
            if best > 0.4:
                scores.append((row["id"], best))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    @staticmethod
    def _search_arabic(query: str, rows: list[dict], top_k: int) -> list[tuple[int, float]]:
        from rapidfuzz import fuzz

        q_norm = normalize_arabic(query)
        if len(q_norm) < 2:
            return []

        exact: list[tuple[int, float, int]] = []
        fuzzy: list[tuple[int, float]] = []

        for row in rows:
            raw = row.get("text_ar_normalized") or row.get("text_ar") or ""
            if not raw:
                continue
            ar_norm = normalize_arabic(raw)
            if not ar_norm:
                continue
            if q_norm in ar_norm:
                exact.append((row["id"], 0.98, len(ar_norm)))
                continue
            if len(q_norm) >= 4:
                ratio = fuzz.partial_ratio(q_norm, ar_norm) / 100.0
                if ratio >= 90:
                    fuzzy.append((row["id"], ratio * 0.92))

        if exact:
            exact.sort(key=lambda x: (-x[1], x[2]))
            return [(aid, sc) for aid, sc, _ in exact[:top_k]]

        fuzzy.sort(key=lambda x: x[1], reverse=True)
        return fuzzy[:top_k]
