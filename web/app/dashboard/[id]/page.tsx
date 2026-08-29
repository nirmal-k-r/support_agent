import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { query } from "@/lib/db";
import { processTicketAction, approveTicketAction, sendTicketEmailAction } from "@/lib/actions";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    redirect("/login");
  }

  const { rows } = await query<{
    id: string;
    conversation_id: string;
    customer_issue: string;
    submitter_email: string | null;
    user_email: string | null;
    category: string | null;
    tech_response: string | null;
    email_response: string | null;
    should_handoff: boolean | null;
    status: string;
    processed_by_email: string | null;
    approved_by_email: string | null;
    approved_at: string | null;
    created_at: string;
  }>(
    `SELECT t.*, u.email AS user_email,
            p.email AS processed_by_email, a.email AS approved_by_email
     FROM tickets t
     LEFT JOIN users u ON u.id = t.submitter_user_id
     LEFT JOIN users p ON p.id = t.processed_by
     LEFT JOIN users a ON a.id = t.approved_by
     WHERE t.id = $1`,
    [params.id]
  );

  if (rows.length === 0) {
    return (
      <div className="card">
        <p>Ticket not found.</p>
        <Link href="/dashboard" className="link">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const t = rows[0];
  const from = t.user_email || t.submitter_email || "anonymous";

  return (
    <div>
      <Link href="/dashboard" className="link">
        ← Back to dashboard
      </Link>
      <div className="card" style={{ marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0 }}>{t.conversation_id}</h1>
          <span className={`badge ${t.status}`}>{t.status}</span>
        </div>
        <p className="lead">
          Submitted by {from} · {new Date(t.created_at).toLocaleString()}
        </p>

        <h2>Customer issue</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{t.customer_issue}</p>

        <h2>Agent response</h2>
        {t.tech_response ? (
          <div>
            {t.category && (
              <p>
                <strong>Category:</strong> {t.category}
              </p>
            )}
            <p style={{ whiteSpace: "pre-wrap" }}>
              <strong>Technical response:</strong> {t.tech_response}
            </p>
            {t.email_response && (
              <p style={{ whiteSpace: "pre-wrap" }}>
                <strong>Email response:</strong> {t.email_response}
              </p>
            )}
            {t.processed_by_email && (
              <p className="lead">Processed by {t.processed_by_email}</p>
            )}
          </div>
        ) : (
          <p className="lead">Not processed yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Actions</h2>
        {t.status === "new" && (
          <form action={processTicketAction.bind(null, t.id)}>
            <button className="btn" type="submit">
              Process with agent
            </button>
          </form>
        )}
        {t.status === "pending_approval" && (
          <>
            <p className="lead">
              Review the agent response, then approve to finalise.
            </p>
            <form action={approveTicketAction.bind(null, t.id)}>
              <button className="btn" type="submit">
                Approve ticket
              </button>
            </form>
          </>
        )}
        {t.status === "approved" && (
          <p className="lead">
            Approved{t.approved_by_email ? ` by ${t.approved_by_email}` : ""}.
            (Email send pending a later release.)
          </p>
        )}
        {t.status === "handed_off" && (
          <p className="lead">
            This ticket was handed off to a human operator and needs no further
            approval here.
          </p>
        )}
        {t.status === "discarded" && (
          <p className="lead">This ticket was discarded by the agent.</p>
        )}

        {t.submitter_email && (
          <form action={sendTicketEmailAction.bind(null, t.id)} style={{ marginTop: 16 }}>
            <button className="btn btn-secondary" type="submit">
              Send email to customer
            </button>
            <span className="muted" style={{ marginLeft: 10 }}>
              {t.submitter_email}
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
