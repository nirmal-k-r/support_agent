import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/lib/auth";
import { query } from "@/lib/db";
import { nanoid } from "nanoid";

const schema = z.object({
  customer_issue: z.string().min(3).max(10_000),
  submitter_email: z.string().email().max(254).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid issue is required." }, { status: 400 });
  }

  let submitterEmail = parsed.data.submitter_email?.toLowerCase().trim();
  if (user) {
    // Logged-in users are linked; anonymous email only used when not logged in.
    submitterEmail = user.email;
  } else if (!submitterEmail) {
    return NextResponse.json(
      { error: "Please provide a contact email, or log in." },
      { status: 400 }
    );
  }

  const conversationId = `CONV-${nanoid(8).toUpperCase()}`;
  const { rows } = await query<{ id: string }>(
    `INSERT INTO tickets (conversation_id, customer_issue, submitter_user_id, submitter_email, status)
     VALUES ($1, $2, $3, $4, 'new') RETURNING id`,
    [conversationId, parsed.data.customer_issue, user?.id ?? null, submitterEmail]
  );

  return NextResponse.json({ ok: true, id: rows[0].id });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = isStaff(user.role)
    ? `SELECT t.id, t.conversation_id, t.customer_issue, t.status, t.category,
              t.submitter_email, t.created_at, u.email AS user_email
       FROM tickets t
       LEFT JOIN users u ON u.id = t.submitter_user_id
       ORDER BY t.created_at DESC`
    : `SELECT id, conversation_id, customer_issue, status, category, created_at
       FROM tickets WHERE submitter_user_id = $1 ORDER BY created_at DESC`;

  const params = isStaff(user.role) ? [] : [user.id];
  const { rows } = await query(sql, params);
  return NextResponse.json({ tickets: rows });
}
