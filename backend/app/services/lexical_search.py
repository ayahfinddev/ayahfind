"""OpenSearch lexical retrieval with in-memory fallback."""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any

from rapidfuzz import fuzz

from app.core.arabic_text import (
    arabic_for_search,
    arabic_token_variants,
    normalize_arabic,
    query_matches_basmala,
)
from app.core.config import Settings, get_settings
from app.core.phonetic import detect_script
from app.core.retrieval_scoring import (
    baseline_arabic_score,
    baseline_lexical_arabic_score,
    combine_arabic_scores,
)

logger = logging.getLogger("ayahfind.lexical")

_ARABIC_TOKEN_RE = __import__("re").compile(r"[\u0600-\u06FF]+")


class LexicalSearchEngine:
    _cached_rows: list[dict] | None = None
    last_trace: dict[str, Any]

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = None
        self._available: bool | None = None
        self.last_trace = {}

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
        t0 = time.perf_counter()
        if self._opensearch_up():
            hits = self._search_opensearch(query, top_k)
            self.last_trace = {
                "path": "opensearch",
                "rows_scanned": 0,
                "rows_augmented": 0,
                "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
            }
            return hits

        rows = self._rows(self._settings)
        if detect_script(query) == "arabic":
            hits, trace = self._search_arabic_traced(query, rows, top_k)
            trace["duration_ms"] = round((time.perf_counter() - t0) * 1000, 1)
            self.last_trace = trace
            return hits

        hits = self._search_fallback_latin(query, rows, top_k)
        self.last_trace = {
            "path": "latin_fallback",
            "rows_scanned": len(rows),
            "rows_augmented": 0,
            "duration_ms": round((time.perf_counter() - t0) * 1000, 1),
        }
        return hits

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

    def _search_fallback_latin(self, query: str, rows: list[dict], top_k: int) -> list[tuple[int, float]]:
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
    def _query_anchor_tokens(q_norm: str) -> set[str]:
        tokens = [t for t in _ARABIC_TOKEN_RE.findall(q_norm) if len(t) >= 3]
        if not tokens:
            return {q_norm[:4]} if len(q_norm) >= 4 else set()
        anchors: set[str] = set()
        for t in sorted(tokens, key=len, reverse=True)[:4]:
            anchors.update(arabic_token_variants(t))
        return anchors

    @classmethod
    def _row_passes_anchor(cls, ar_norm: str, anchors: set[str]) -> bool:
        if not anchors:
            return True
        return any(a in ar_norm for a in anchors)

    @staticmethod
    def _row_arabic_targets(row: dict, q_norm: str | None = None) -> list[str]:
        surah = int(row.get("surah_number", row.get("surah", 0)))
        ayah = int(row.get("ayah_number", row.get("ayah", 0)))
        text_ar = row.get("text_ar") or ""
        ar_norm = row.get("text_ar_normalized") or normalize_arabic(text_ar)
        ar_search = row.get("text_ar_search_normalized") or arabic_for_search(text_ar, surah, ayah)
        basmala_query = query_matches_basmala(q_norm) if q_norm else False
        targets: list[str] = []
        if ar_search:
            targets.append(ar_search)
        if ar_norm and ar_norm not in targets:
            if basmala_query or not ar_search:
                targets.append(ar_norm)
        return targets

    @classmethod
    def _search_arabic_baseline(
        cls, q_norm: str, rows: list[dict], top_k: int, anchors: set[str]
    ) -> tuple[list[tuple[int, float]], int]:
        exact: list[tuple[int, float, int]] = []
        fuzzy: list[tuple[int, float]] = []
        scanned = 0

        for row in rows:
            targets = cls._row_arabic_targets(row, q_norm)
            if not targets:
                continue
            if not any(cls._row_passes_anchor(t, anchors) for t in targets):
                continue
            scanned += 1
            score = max(baseline_lexical_arabic_score(q_norm, t) for t in targets)
            shortest = min(len(t) for t in targets)
            if score >= 0.98:
                exact.append((row["id"], score, shortest))
            elif score > 0:
                fuzzy.append((row["id"], score))

        if exact:
            exact.sort(key=lambda x: (-x[1], x[2]))
            return [(aid, sc) for aid, sc, _ in exact[:top_k]], scanned
        fuzzy.sort(key=lambda x: x[1], reverse=True)
        return fuzzy[:top_k], scanned

    @staticmethod
    def _row_arabic_augmented(q_norm: str, row: dict) -> float:
        surah = int(row.get("surah_number", row.get("surah", 0)))
        ayah = int(row.get("ayah_number", row.get("ayah", 0)))
        text_ar = row.get("text_ar") or ""
        ar_norm = row.get("text_ar_normalized") or normalize_arabic(text_ar)
        ar_search = row.get("text_ar_search_normalized") or arabic_for_search(text_ar, surah, ayah)

        baseline = baseline_lexical_arabic_score(q_norm, ar_norm)
        best_aug = 0.0
        for target in (ar_norm, ar_search):
            if not target:
                continue
            if baseline < 0.98 and fuzz.partial_ratio(q_norm, target) < 55:
                continue
            base, reason = baseline_arabic_score(q_norm, target)
            aug, _, _ = combine_arabic_scores(base, reason, q_norm, target)
            best_aug = max(best_aug, aug)
        return max(baseline, best_aug)

    def _search_arabic_traced(
        self, query: str, rows: list[dict], top_k: int
    ) -> tuple[list[tuple[int, float]], dict[str, Any]]:
        settings = self._settings
        q_norm = normalize_arabic(query)
        if len(q_norm) < 2:
            return [], {"path": "arabic_empty", "rows_scanned": 0, "rows_augmented": 0}

        t0 = time.perf_counter()
        budget_ms = settings.arabic_lexical_ms_budget
        anchors = self._query_anchor_tokens(q_norm)

        baseline_hits, scanned = self._search_arabic_baseline(q_norm, rows, top_k, anchors)
        merged: dict[int, float] = dict(baseline_hits)
        best_base = baseline_hits[0][1] if baseline_hits else 0.0
        path = "arabic_baseline"
        augmented = 0

        by_id = {row["id"]: row for row in rows}
        cap = settings.arabic_lexical_augment_cap
        for aid in list(merged.keys())[:cap]:
            if (time.perf_counter() - t0) * 1000 > budget_ms:
                path = "arabic_baseline_budget"
                break
            row = by_id.get(aid)
            if row:
                merged[aid] = max(merged[aid], self._row_arabic_augmented(q_norm, row))
                augmented += 1

        if best_base < 0.88 and (time.perf_counter() - t0) * 1000 < budget_ms:
            path = "arabic_prefilter_augment"
            pref: list[tuple[dict, float]] = []
            limit = settings.arabic_lexical_prefilter_limit
            for row in rows:
                if (time.perf_counter() - t0) * 1000 > budget_ms:
                    path = "arabic_prefilter_budget"
                    break
                targets = self._row_arabic_targets(row, q_norm)
                if not targets or not any(self._row_passes_anchor(t, anchors) for t in targets):
                    continue
                pr = max(fuzz.partial_ratio(q_norm, t) for t in targets)
                if pr >= 52:
                    pref.append((row, pr))
            pref.sort(key=lambda x: x[1], reverse=True)
            scanned += len(pref)
            for row, _ in pref[:limit]:
                if (time.perf_counter() - t0) * 1000 > budget_ms:
                    break
                aid = row["id"]
                if aid in merged:
                    continue
                final = self._row_arabic_augmented(q_norm, row)
                if final >= 0.52:
                    merged[aid] = final
                    augmented += 1

        ranked = sorted(merged.items(), key=lambda x: x[1], reverse=True)[:top_k]
        trace = {
            "path": path,
            "rows_scanned": scanned,
            "rows_augmented": augmented,
            "baseline_best": round(best_base, 4),
            "anchor_tokens": sorted(anchors)[:8],
            "hit_count": len(ranked),
        }
        if (time.perf_counter() - t0) * 1000 > budget_ms:
            trace["budget_exceeded"] = True
        return ranked, trace
