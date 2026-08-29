import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { query } from "@/lib/db";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).optional().default(""),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'user') RETURNING id`,
    [email, passwordHash, parsed.data.name]
  );

  const token = await createSession(rows[0].id);
  setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
