"""CLI: download, ingest, preprocess, index, sync DB, OpenSearch, audio."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from data_pipeline.build_audio_index import build_mfcc_bank
from data_pipeline.build_index import build_semantic_index
from data_pipeline.download_quran import download_full_quran
from data_pipeline.index_opensearch import index_opensearch
from data_pipeline.ingest import ingest
from data_pipeline.preprocess import preprocess
from data_pipeline.sync_db import sync_db

RAW_FULL = REPO_ROOT / "data" / "raw" / "quran_full.json"
RAW_SAMPLE = REPO_ROOT / "data" / "raw" / "quran_sample.json"
STAGED = REPO_ROOT / "data" / "processed" / "quran_staged.json"
PROCESSED = REPO_ROOT / "data" / "processed" / "ayahs_processed.json"
INDEX_DIR = REPO_ROOT / "vector_index"
MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def _source_path(use_full: bool) -> Path:
    if use_full and RAW_FULL.exists():
        return RAW_FULL
    if use_full:
        download_full_quran(RAW_FULL)
        return RAW_FULL
    return RAW_SAMPLE


def cmd_bootstrap(_: argparse.Namespace) -> None:
    """Full pipeline: download, preprocess, all indexes, DB sync."""
    print("=== AyahFind bootstrap ===")
    src = _source_path(use_full=True)
    ingest(src, STAGED.parent)
    print("Ingest done")
    preprocess(STAGED, PROCESSED)
    print("Preprocess done")
    build_semantic_index(PROCESSED, INDEX_DIR, MODEL)
    print("FAISS done")
    build_mfcc_bank(PROCESSED, REPO_ROOT / "vector_index" / "mfcc_bank.npz")
    print("MFCC bank done")
    try:
        index_opensearch(PROCESSED)
    except Exception as e:
        print(f"OpenSearch skipped: {e}")
    n = sync_db(PROCESSED)
    print(f"DB sync: {n} ayahs")
    print("=== Bootstrap complete ===")


def main() -> None:
    parser = argparse.ArgumentParser(description="AyahFind data pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("download", help="Download full Quran JSON")
    sub.add_parser("bootstrap", help="Full download + preprocess + index + DB")
    p_ingest = sub.add_parser("ingest")
    p_ingest.add_argument("--source", type=Path, default=None)
    p_ingest.add_argument("--full", action="store_true")
    sub.add_parser("preprocess")
    p_index = sub.add_parser("index")
    p_index.add_argument("--model", default=MODEL)
    sub.add_parser("sync-db")
    sub.add_parser("index-opensearch")
    sub.add_parser("index-audio")
    sub.add_parser("all", help="Sample corpus pipeline")

    args = parser.parse_args()

    if args.command == "download":
        download_full_quran(RAW_FULL)
    elif args.command == "bootstrap":
        cmd_bootstrap(args)
    elif args.command == "ingest":
        src = args.source or _source_path(getattr(args, "full", False))
        print(ingest(src, STAGED.parent))
    elif args.command == "preprocess":
        if not STAGED.exists():
            ingest(_source_path(False), STAGED.parent)
        print(preprocess(STAGED, PROCESSED))
    elif args.command == "index":
        if not PROCESSED.exists():
            preprocess(STAGED, PROCESSED)
        build_semantic_index(PROCESSED, INDEX_DIR, args.model)
    elif args.command == "sync-db":
        print(sync_db(PROCESSED))
    elif args.command == "index-opensearch":
        print(index_opensearch(PROCESSED))
    elif args.command == "index-audio":
        print(build_mfcc_bank(PROCESSED, REPO_ROOT / "vector_index" / "mfcc_bank.npz"))
    elif args.command == "all":
        ingest(_source_path(False), STAGED.parent)
        preprocess(STAGED, PROCESSED)
        build_semantic_index(PROCESSED, INDEX_DIR, MODEL)
        build_mfcc_bank(PROCESSED, REPO_ROOT / "vector_index" / "mfcc_bank.npz")
        sync_db(PROCESSED)


if __name__ == "__main__":
    main()
