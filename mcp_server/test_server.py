"""Smoke test for Week 8 MCP server.

Run with: python3 test_server.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_SCRIPT = Path(__file__).resolve().parent / "server.py"


async def main() -> None:
    params = StdioServerParameters(command=sys.executable, args=[str(SERVER_SCRIPT)])

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            tool_names = {tool.name for tool in tools.tools}
            print("Tools:", sorted(tool_names))
            assert {"rag_search", "reply_to_email"} <= tool_names
            assert "discord_reply" not in tool_names

            result = await session.call_tool(
                "rag_search",
                {
                    "query": "Cannot connect to Wi-Fi",
                    "k": 5,
                },
            )
            assert not result.isError, result
            payload = json.loads(result.content[0].text)
            print(json.dumps(payload, indent=2))
            assert payload["returned"] > 0

            email_result = await session.call_tool(
                "reply_to_email",
                {
                    "to_email": "customer@example.com",
                    "subject": "Support ticket update",
                    "body": "Test support reply from MCP server",
                    "dry_run": True,
                },
            )
            assert not email_result.isError, email_result
            email_payload = json.loads(email_result.content[0].text)
            print(json.dumps(email_payload, indent=2))
            assert email_payload["status"] == "dry_run"

    print("All checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
