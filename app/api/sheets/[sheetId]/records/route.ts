import { NextRequest, NextResponse } from "next/server";
import { addRecord } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = Promise<{ sheetId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    if (!sheetId) return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    const { values } = await req.json();
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return NextResponse.json({ error: "Record values are required" }, { status: 400 });
    }
    const record = addRecord(user.id, sheetId, values);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add record";
    const status = message === "Forbidden" ? 403 : message === "Sheet not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
