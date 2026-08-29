import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { query } from "@/lib/db";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { rows } = await query<{
    id: string;
    password_hash: string;
  }>("SELECT id, password_hash FROM users WHERE email = $1", [email]);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, rows[0].password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await createSession(rows[0].id);
  setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
