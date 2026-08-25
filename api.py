"""HTTP API for the MCP-backed support agent.

Run locally with: python3 api.py
"""

import json
import os
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError

from cloud_agent import repair_response, respond

app = FastAPI(title="Support Agent API", version="1.0.0")


class ChatRequest(BaseModel):
    # `Customer_Issue` is the API's preferred field name. `message` remains
    # supported so existing clients do not break.
    Conversation_ID: Optional[str] = Field(default=None, max_length=200)
    Customer_Issue: Optional[str] = Field(default=None, max_length=10_000)
    message: Optional[str] = Field(default=None, max_length=10_000)


class TicketResponse(BaseModel):
    """The validated, client-facing support-ticket response."""

    Conversation_ID: str = Field(min_length=1, max_length=200)
    Customer_Issue: str = Field(min_length=1, max_length=10_000)
    Tech_Response: str = Field(min_length=1, max_length=10_000)
    Issue_Category: Literal[
        "Account", "Network", "Hardware", "Software", "Performance", "other"
    ]
    Email_Response: str = Field(min_length=1, max_length=10_000)
    Should_Handoff: bool


def parse_ticket_response(raw_response: str, conversation_id: Optional[str]) -> TicketResponse:
    """Decode model output and apply caller-owned fields before validation."""
    payload = json.loads(raw_response)
    if not isinstance(payload, dict):
        raise ValueError("The support model response must be a JSON object.")
    if conversation_id:
        payload["Conversation_ID"] = conversation_id
    return TicketResponse.model_validate(payload)


@app.get("/health")
async def health() -> dict[str, str]:
    """Lightweight health check for Render."""
    return {"status": "ok"}


@app.post("/ticket", response_model=TicketResponse)
async def chat(request: ChatRequest) -> TicketResponse:
    """Send a customer message to the agent and return a validated ticket."""
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

    try:
        ticket = parse_ticket_response(answer, request.Conversation_ID)
    except (ValueError, ValidationError) as first_error:
        try:
            repaired_answer = await repair_response(issue, answer, str(first_error))
            ticket = parse_ticket_response(repaired_answer, request.Conversation_ID)
        except (RuntimeError, ValueError, ValidationError, json.JSONDecodeError) as exc:
            raise HTTPException(
                status_code=502,
                detail="The support model returned an invalid ticket response.",
            ) from exc

    return ticket


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
