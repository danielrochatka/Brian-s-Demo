import { NextRequest, NextResponse } from "next/server";
import { deleteRecord, updateRecord } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ sheetId: string; recordId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId, recordId } = await params;
    const { values } = await req.json();
    const record = updateRecord(user.id, sheetId, recordId, values ?? {});
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update record" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId, recordId } = await params;
    deleteRecord(user.id, sheetId, recordId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete record" }, { status: 400 });
  }
}
