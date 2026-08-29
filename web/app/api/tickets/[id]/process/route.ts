import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/lib/auth";
import { processTicket } from "@/lib/tickets";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await processTicket(params.id, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.code });
  }
  return NextResponse.json(result);
}
