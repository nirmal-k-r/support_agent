"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, getSessionUser, isStaff, hashPassword } from "./auth";
import { processTicket, approveTicket } from "./tickets";
import { query } from "./db";

export async function logout() {
  const token = cookies().get("ms_session")?.value;
  await destroySession(token);
  redirect("/login");
}

export async function processTicketAction(id: string) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    redirect("/login");
  }
  const result = await processTicket(id, user.id);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard");
}

export async function approveTicketAction(id: string) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    redirect("/login");
  }
  const result = await approveTicket(id, user.id);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard");
}

export async function createStaffAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "officer") as "officer" | "admin";

  if (!email || !password || (role !== "officer" && role !== "admin")) {
    throw new Error("Invalid input.");
  }

  const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.length > 0) {
    throw new Error("Email already exists.");
  }

  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)`,
    [email, passwordHash, name, role]
  );
  revalidatePath("/admin");
}

export async function changeRoleAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") {
    redirect("/login");
  }
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "") as
    | "user"
    | "officer"
    | "admin";
  if (!id || !["user", "officer", "admin"].includes(role)) {
    throw new Error("Invalid input.");
  }
  await query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  revalidatePath("/admin");
}
