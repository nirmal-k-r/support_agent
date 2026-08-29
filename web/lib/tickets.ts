import { query } from "./db";
import { sendTicketEmail } from "./email";

const PYTHON_API_URL = (
  process.env.PYTHON_API_URL || "https://support-agent-zkz4.onrender.com"
).replace(/\/$/, "");

export type ProcessResult =
  | { ok: true; status: string; shouldHandoff: boolean }
  | { ok: false; error: string; code: number };

export async function processTicket(
  ticketId: string,
  userId: string
): Promise<ProcessResult> {
  const { rows: ticketRows } = await query(
    "SELECT id, customer_issue, conversation_id, status FROM tickets WHERE id = $1",
    [ticketId]
  );
  if (ticketRows.length === 0) {
    return { ok: false, error: "Ticket not found", code: 404 };
  }
  const ticket = ticketRows[0];
  if (ticket.status === "approved" || ticket.status === "handed_off") {
    return { ok: false, error: "Ticket already finalised.", code: 409 };
  }

  let agent: any;
  try {
    const res = await fetch(`${PYTHON_API_URL}/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Customer_Issue: ticket.customer_issue,
        Conversation_ID: ticket.conversation_id,
      }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: `Agent error: ${detail.detail || res.statusText}`,
        code: 502,
      };
    }
    agent = await res.json();
  } catch {
    return { ok: false, error: "Could not reach the support agent.", code: 502 };
  }

  const shouldHandoff = Boolean(agent.Should_Handoff);
  const status = shouldHandoff ? "handed_off" : "pending_approval";

  await query(
    `UPDATE tickets
     SET conversation_id = $1,
         tech_response = $2,
         category = $3,
         email_response = $4,
         should_handoff = $5,
         status = $6,
         processed_by = $7,
         updated_at = now()
     WHERE id = $8`,
    [
      agent.Conversation_ID || ticket.conversation_id,
      agent.Tech_Response || "",
      agent.Issue_Category || "other",
      agent.Email_Response || "",
      shouldHandoff,
      status,
      userId,
      ticket.id,
    ]
  );

  return { ok: true, status, shouldHandoff };
}

export type ApproveResult =
  | { ok: true; status: string }
  | { ok: false; error: string; code: number };

export async function approveTicket(
  ticketId: string,
  userId: string
): Promise<ApproveResult> {
  const { rows } = await query(
    "SELECT id, status, submitter_email, email_response FROM tickets WHERE id = $1",
    [ticketId]
  );
  if (rows.length === 0) {
    return { ok: false, error: "Ticket not found", code: 404 };
  }
  const ticket = rows[0];
  if (ticket.status !== "pending_approval") {
    return {
      ok: false,
      error: "Only pending tickets can be approved.",
      code: 409,
    };
  }

  await query(
    `UPDATE tickets
     SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now()
     WHERE id = $2`,
    [userId, ticket.id]
  );

  if (ticket.submitter_email) {
    await sendTicketEmail({
      to: ticket.submitter_email,
      subject: `Your support ticket has been resolved (${ticket.conversation_id})`,
      text: ticket.email_response || "Your ticket has been approved.",
    });
  }

  return { ok: true, status: "approved" };
}
