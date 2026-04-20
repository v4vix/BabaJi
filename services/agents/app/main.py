from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="cerebral-cortex-agents", version="0.1.0")

AGENT_SWARM = [
    "Intake",
    "Router",
    "Jyotish",
    "KB Retrieval",
    "Scripture Scholar",
    "KG Builder",
    "Rashifal Generator",
    "Matchmaking Analyst",
    "Vaastu Analyst",
    "Gem Consultant",
    "Ritual Safety",
    "Ayurveda Safety",
    "Video Script",
    "Video Render",
    "Consult Concierge",
    "Red-Team Critic",
    "Style & UX Copy",
    "QA Evaluator",
]


class AgentRunRequest(BaseModel):
    goal: str
    context: dict[str, Any] = {}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "agents"}


@app.get("/v1/swarm")
async def swarm() -> dict[str, Any]:
    return {"agents": AGENT_SWARM}


@app.post("/v1/run")
async def run(request: AgentRunRequest) -> dict[str, Any]:
    route = ["Intake", "Router"]
    goal = request.goal.lower()
    if "vaastu" in goal:
        route += ["Vaastu Analyst", "KB Retrieval", "Ritual Safety"]
    elif "kundli" in goal or "jyotish" in goal:
        route += ["Jyotish", "KB Retrieval"]
    elif "video" in goal:
        route += ["Video Script", "Video Render"]
    else:
        route += ["Scripture Scholar", "KB Retrieval"]
    route += ["Red-Team Critic", "QA Evaluator"]
    return {
        "goal": request.goal,
        "route": route,
        "result": "Swarm plan generated. Integrate LangGraph state machine with tool adapters for production.",
    }
