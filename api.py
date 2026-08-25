"""HTTP API for the MCP-backed support agent.

Run locally with: python3 api.py
"""

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from cloud_agent import respond

app = FastAPI(title="Support Agent API", version="1.0.0")


class ChatRequest(BaseModel):
    # `Customer_Issue` is the API's preferred field name. `message` remains
    # supported so existing clients do not break.
    Conversation_ID: Optional[str] = Field(default=None, max_length=200)
    Customer_Issue: Optional[str] = Field(default=None, max_length=10_000)
    message: Optional[str] = Field(default=None, max_length=10_000)


class ChatResponse(BaseModel):
    Conversation_ID: Optional[str] = None
    answer: str


@app.get("/health")
async def health() -> dict[str, str]:
    """Lightweight health check for Render."""
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Send a customer message to the agent and return its response."""
    issue = request.Customer_Issue or request.message
    if not issue or not issue.strip():
        raise HTTPException(
            status_code=422,
            detail="Provide a non-empty Customer_Issue (or message).",
        )
    try:
        answer = await respond(issue)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ChatResponse(Conversation_ID=request.Conversation_ID, answer=answer)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=int(os.getenv("PORT", "3005")))
