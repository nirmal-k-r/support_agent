import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    redirect("/login");
  }

  const { rows } = await query<{
    id: string;
    conversation_id: string;
    customer_issue: string;
    status: string;
    category: string | null;
    submitter_email: string | null;
    user_email: string | null;
    created_at: string;
  }>(
    `SELECT t.id, t.conversation_id, t.customer_issue, t.status, t.category,
            t.submitter_email, u.email AS user_email, t.created_at
     FROM tickets t
     LEFT JOIN users u ON u.id = t.submitter_user_id
     ORDER BY t.created_at DESC`
  );

  return (
    <div>
      <h1>Support dashboard</h1>
      <p className="lead">All tickets submitted to My Support.</p>

      <div className="card">
        {rows.length === 0 ? (
          <p className="lead">No tickets yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Conversation</th>
                <th>Issue</th>
                <th>From</th>
                <th>Category</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.conversation_id}</td>
                  <td>{t.customer_issue.slice(0, 60)}…</td>
                  <td>{t.user_email || t.submitter_email || "anonymous"}</td>
                  <td>{t.category || "—"}</td>
                  <td>
                    <span className={`badge ${t.status}`}>{t.status}</span>
                  </td>
                  <td>
                    <Link href={`/dashboard/${t.id}`} className="link">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
