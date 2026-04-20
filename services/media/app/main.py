from __future__ import annotations

import uuid
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="cerebral-cortex-media", version="0.1.0")

JOBS: dict[str, dict[str, Any]] = {}


class JobRequest(BaseModel):
    topic: str
    payload: dict[str, Any]


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "media"}


@app.post("/v1/jobs/video")
async def create_video_job(request: JobRequest) -> dict[str, Any]:
    job_id = f"video-{uuid.uuid4().hex[:10]}"
    JOBS[job_id] = {
        "topic": request.topic,
        "payload": request.payload,
        "status": "queued",
        "playback_url": None,
    }
    return {"job_id": job_id, "status": "queued", "playback_url": None}


@app.get("/v1/jobs/video/{job_id}")
async def get_video_job(job_id: str) -> dict[str, Any]:
    return JOBS.get(job_id, {"job_id": job_id, "status": "unknown"})
