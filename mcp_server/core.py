"""Core logic for Week 8 tech support MCP tools."""

from __future__ import annotations

import csv
import functools
import math
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "tech_support_dataset.csv"

ISSUE_COL_CANDIDATES = [
    "Customer_Issue",
    "Issue",
    "customer_issue",
    "issue",
]
RESPONSE_COL_CANDIDATES = [
    "Tech_Response",
    "Resolution",
    "tech_response",
    "resolution",
]

@functools.lru_cache(maxsize=1)
def load_dataset() -> list[dict[str, str]]:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    with DATA_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        issue_col = _pick_column(columns, ISSUE_COL_CANDIDATES, "issue")
        response_col = _pick_column(columns, RESPONSE_COL_CANDIDATES, "response")

        rows: list[dict[str, str]] = []
        for row in reader:
            issue = str(row.get(issue_col, "")).strip()
            response = str(row.get(response_col, "")).strip()
            if issue and response:
                rows.append({"issue": issue, "response": response})

    if not rows:
        raise ValueError("Dataset has no usable issue/response rows.")

    return rows


def _pick_column(columns: list[str], candidates: list[str], label: str) -> str:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    raise ValueError(
        f"Could not find a {label} column. Available columns: {columns}. "
        f"Expected one of: {candidates}"
    )


def _tokenize(text: str) -> set[str]:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return {part for part in cleaned.split() if part}


def _score_match(query: str, issue: str) -> float:
    # Blend lexical overlap and character similarity to keep matching simple and robust.
    q_tokens = _tokenize(query)
    i_tokens = _tokenize(issue)

    if q_tokens and i_tokens:
        intersection = len(q_tokens & i_tokens)
        denom = math.sqrt(len(q_tokens) * len(i_tokens))
        token_score = intersection / denom if denom else 0.0
    else:
        token_score = 0.0

    # Local import avoids module-wide cost unless search is used.
    from difflib import SequenceMatcher

    seq_score = SequenceMatcher(None, query.lower(), issue.lower()).ratio()
    return (0.7 * token_score) + (0.3 * seq_score)


def rag_search(query: str, k: int = 20, min_score: float = 0.0) -> dict[str, Any]:
    """Return top-k support rows similar to the user's issue."""
    if not query or not query.strip():
        raise ValueError("query must be a non-empty string")
    if k < 1:
        raise ValueError("k must be at least 1")
    if not 0.0 <= min_score <= 1.0:
        raise ValueError("min_score must be between 0 and 1")

    rows = load_dataset()
    scored = [
        {
            "issue": row["issue"],
            "tech_response": row["response"],
            "score": round(_score_match(query, row["issue"]), 6),
        }
        for row in rows
    ]
    scored.sort(key=lambda item: item["score"], reverse=True)

    top_k = max(1, min(int(k), len(scored)))
    ranked = scored[:top_k]

    matches: list[dict[str, Any]] = []
    for item in ranked:
        score = float(item["score"])
        if score < min_score:
            continue
        matches.append(item)

    return {
        "query": query,
        "returned": len(matches),
        "total_records": len(rows),
        "matches": matches,
    }


def reply_to_email(
    to_email: str,
    subject: str,
    body: str,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
    smtp_host: str | None = None,
    smtp_port: int | None = None,
    from_email: str | None = None,
    use_tls: bool = True,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Send a plain-text email through SMTP using configured credentials."""
    if not to_email.strip():
        raise ValueError("to_email is required")
    if not subject.strip():
        raise ValueError("subject is required")
    if not body.strip():
        raise ValueError("body is required")

    username = (smtp_username or os.getenv("SMTP_USERNAME", "")).strip()
    password = smtp_password or os.getenv("SMTP_PASSWORD", "")
    host = (smtp_host or os.getenv("SMTP_HOST", "smtp.gmail.com")).strip()
    port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
    sender = (from_email or os.getenv("FROM_EMAIL") or username).strip()
    if not sender and dry_run:
        sender = "support@example.com"
    if not sender:
        raise ValueError("FROM_EMAIL or SMTP_USERNAME must be configured")

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to_email.strip()
    msg["Subject"] = subject.strip()
    msg.set_content(body)

    if dry_run:
        return {"status": "dry_run", "to": to_email.strip(), "from": sender, "subject": subject.strip()}

    if not username or not password:
        raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured")

    with smtplib.SMTP(host, port, timeout=30) as server:
        if use_tls:
            server.starttls()
        server.login(username, password)
        server.send_message(msg)

    return {
        "status": "sent",
        "to": to_email.strip(),
        "from": sender,
        "subject": subject.strip(),
    }
