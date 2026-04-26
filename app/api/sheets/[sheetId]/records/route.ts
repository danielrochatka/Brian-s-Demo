import { NextRequest, NextResponse } from "next/server";
import { addRecord } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ sheetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    const { values } = await req.json();
    const record = addRecord(user.id, sheetId, values ?? {});
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add record" }, { status: 400 });
  }
}
