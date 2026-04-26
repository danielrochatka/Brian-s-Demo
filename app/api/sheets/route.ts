import { NextRequest, NextResponse } from "next/server";
import { createSheet, listSheetsForUser } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sheets: listSheetsForUser(user.id) });
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const sheet = createSheet(user.id, title.trim());
  return NextResponse.json({ sheet });
}
