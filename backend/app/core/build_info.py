"""Build / retrieval version stamps for deploy verification."""



from __future__ import annotations



import os



# Bump when retrieval behavior changes (shown on /health).

RETRIEVAL_VERSION = "2025-05-23-english-phrase-v1"



BUILD_ID = os.environ.get("RENDER_GIT_COMMIT", "").strip() or os.environ.get(

    "AYAHFIND_BUILD_ID", "dev"

)

