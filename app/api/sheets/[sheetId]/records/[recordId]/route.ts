import { NextRequest, NextResponse } from "next/server";
import { deleteRecord, updateRecord } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = { params: { sheetId: string; recordId: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId, recordId } = params;
    if (!sheetId) return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    const { values } = await req.json();
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return NextResponse.json({ error: "Record values are required" }, { status: 400 });
    }
    const record = updateRecord(user.id, sheetId, recordId, values);
    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update record";
    const status =
      message === "Forbidden" ? 403 : message === "Sheet not found" || message === "Record not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId, recordId } = params;
    if (!sheetId) return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    deleteRecord(user.id, sheetId, recordId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete record";
    const status =
      message === "Forbidden" ? 403 : message === "Sheet not found" || message === "Record not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
