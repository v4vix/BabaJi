from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from .pipeline import build_plan

app = FastAPI(title="cerebral-cortex-kb", version="0.1.0")

DATA_DIR = Path("/tmp/cortex-kb")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Minimal local index stub: replace with pgvector + proper embeddings in production.
KB_INDEX: list[dict[str, Any]] = [
    {
        "source_id": "kb-jyotish-001",
        "title": "Jyotish Primer",
        "locator": "chapter-2#dasha-basics",
        "confidence": 0.84,
        "text": "Dasha periods are interpreted as tendencies, not certainties.",
        "domain": "jyotish",
    },
    {
        "source_id": "kb-vaastu-001",
        "title": "Vaastu Fundamentals",
        "locator": "section-4#entry-circulation",
        "confidence": 0.8,
        "text": "Entry flow, light, and practical room use are prioritized before major changes.",
        "domain": "vaastu",
    },
]


def _require_admin_upload_token(request: Request) -> None:
    expected = os.environ.get("ADMIN_API_TOKEN") or os.environ.get("API_SECRET")
    if not expected:
        raise HTTPException(status_code=503, detail="Admin upload token is not configured.")
    provided = request.headers.get("X-Admin-Token", "")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid admin upload token.")


class RetrieveRequest(BaseModel):
    query: str
    domain: str
    top_k: int = 3


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "kb"}


@app.post("/v1/retrieve")
async def retrieve(request: RetrieveRequest) -> dict[str, Any]:
    q = request.query.lower()
    candidates = [
        entry
        for entry in KB_INDEX
        if entry["domain"] == request.domain.lower() and any(token in entry["text"].lower() for token in q.split())
    ]
    citations = [
        {
            "source_id": c["source_id"],
            "title": c["title"],
            "locator": c["locator"],
            "confidence": c["confidence"],
        }
        for c in candidates[: request.top_k]
    ]
    return {"citations": citations}


@app.post("/v1/admin/upload")
async def admin_upload(request: Request, file: UploadFile = File(...)) -> dict[str, str]:
    _require_admin_upload_token(request)
    content = await file.read()
    digest = hashlib.sha256(content).hexdigest()[:16]
    dest = DATA_DIR / f"{digest}-{file.filename}"
    dest.write_bytes(content)
    plan = build_plan(dest)
    return {
        "status": "uploaded",
        "path": str(dest),
        "pipeline_note": f"ocr={plan.ocr_engine}, chunking={plan.chunk_strategy}; entity-linking placeholder ready.",
    }
