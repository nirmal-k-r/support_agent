import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";

export async function POST(_req: NextRequest) {
  const token = cookies().get("ms_session")?.value;
  await destroySession(token);
  return NextResponse.json({ ok: true });
}
