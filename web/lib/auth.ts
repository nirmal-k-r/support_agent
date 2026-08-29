import "server-only";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { query } from "./db";

const SESSION_COOKIE = "ms_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || "7");

export type Role = "user" | "officer" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt]
  );
  return token;
}

export function setSessionCookie(token: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function destroySession(token: string | undefined) {
  if (token) {
    await query("DELETE FROM sessions WHERE token = $1", [token]);
  }
  clearSessionCookie();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    role: Role;
    expires_at: string;
  }>(
    `SELECT u.id, u.email, u.name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = $1`,
    [token]
  );

  if (rows.length === 0) {
    clearSessionCookie();
    return null;
  }

  const row = rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function isStaff(role: Role | undefined): boolean {
  return role === "officer" || role === "admin";
}
