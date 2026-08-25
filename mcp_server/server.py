"""MCP server exposing Week 8 tech support tools.

Tools:
    - rag_search: retrieve similar issue-resolution pairs from CSV
    - reply_to_email: send a plain-text email using SMTP
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

import core

mcp = FastMCP("tech-support-helper")


@mcp.tool()
def rag_search(query: str, k: int = 20, min_score: float = 0.0) -> dict[str, Any]:
    """Search similar support tickets in mcp_server/tech_support_dataset.csv.

    Args:
        query: User issue text to search for.
        k: Max number of rows to return.
        min_score: Optional similarity floor between 0 and 1.

    Returns:
        Dict with matched issue-response rows and scores.
    """
    return core.rag_search(query=query, k=k, min_score=min_score)


@mcp.tool()
def reply_to_email(
    to_email: str,
    subject: str,
    body: str,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Send a plain-text reply email via SMTP.

    Configure SMTP_USERNAME, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT, and optional
    FROM_EMAIL in the server environment. For Gmail, use an App Password.
    """
    return core.reply_to_email(
        to_email=to_email,
        subject=subject,
        body=body,
        dry_run=dry_run,
    )


if __name__ == "__main__":
    mcp.run(transport="stdio")
