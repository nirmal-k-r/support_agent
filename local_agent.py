"""Simple terminal support-chat agent using Ollama, LangChain, and MCP.

Run: python3 agent.py
Type /exit to quit.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Change this to any Ollama model installed on your machine.
MODEL = "gemma4:12b-mlx"
OLLAMA_BASE_URL = "http://localhost:11434"

MCP_SERVER = Path(__file__).resolve().parent / "mcp_server" / "server.py"
SYSTEM_PROMPT_FILE = Path(__file__).resolve().parent / "system_prompt.md"


def load_system_prompt() -> str:
    """Load the shared support-agent instructions."""
    if not SYSTEM_PROMPT_FILE.exists():
        raise FileNotFoundError(f"System prompt not found: {SYSTEM_PROMPT_FILE}")
    prompt = SYSTEM_PROMPT_FILE.read_text(encoding="utf-8").strip()
    if not prompt:
        raise ValueError("system_prompt.md is empty")
    return prompt


def format_context(result: dict, limit: int = 3) -> str:
    """Turn the MCP RAG result into compact context for the model."""
    matches = result.get("matches", [])[:limit]
    if not matches:
        return "No similar historical tickets found."
    return "\n".join(
        f"- Issue: {row['issue']}\n  Resolution: {row['tech_response']}"
        for row in matches
    )


async def chat() -> None:
    if not MCP_SERVER.exists():
        raise FileNotFoundError(f"MCP server not found: {MCP_SERVER}")
    system_prompt = load_system_prompt()

    model = ChatOllama(model=MODEL, base_url=OLLAMA_BASE_URL, temperature=0.2)
    history: list[HumanMessage | AIMessage] = []
    params = StdioServerParameters(command=sys.executable, args=[str(MCP_SERVER)])

    print(f"Support chat ready ({MODEL}). Type /exit to quit.")
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            while True:
                question = input("You: ").strip()
                if question.lower() in {"/exit", "exit", "quit"}:
                    return
                if not question:
                    continue

                search = await session.call_tool("rag_search", {"query": question, "k": 20})
                if search.isError:
                    print(f"Tool error: {search.content[0].text}")
                    continue

                rag_result = json.loads(search.content[0].text)
                context = format_context(rag_result)
                messages = [
                    SystemMessage(content=system_prompt),
                    *history[-8:],
                    HumanMessage(
                        content=f"Customer message: {question}\n\nSimilar tickets:\n{context}"
                    ),
                ]
                response = model.invoke(messages)
                answer = str(response.content).strip()
                print(f"Support: {answer}\n")
                history.extend([HumanMessage(content=question), AIMessage(content=answer)])


if __name__ == "__main__":
    asyncio.run(chat())
