from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="cerebral-cortex-kg", version="0.1.0")

GRAPH: dict[str, list[dict[str, str]]] = {
    "Sun": [{"relation": "associated_with", "target": "Ruby"}],
    "Moon": [{"relation": "associated_with", "target": "Pearl"}],
    "Entrance": [{"relation": "influences", "target": "Circulation"}],
}


class Triple(BaseModel):
    subject: str
    relation: str
    object: str


class BuildRequest(BaseModel):
    triples: list[Triple]


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "kg"}


@app.post("/v1/build")
async def build_graph(request: BuildRequest) -> dict[str, Any]:
    for triple in request.triples:
        GRAPH.setdefault(triple.subject, []).append({"relation": triple.relation, "target": triple.object})
    return {"status": "ok", "nodes": len(GRAPH)}


@app.get("/v1/query/{subject}")
async def query_graph(subject: str) -> dict[str, Any]:
    return {"subject": subject, "edges": GRAPH.get(subject, [])}
