import { NextRequest, NextResponse } from "next/server";
import { addField, deleteField, FieldType } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ sheetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    const { name, type, required, options } = await req.json();
    const field = addField(user.id, sheetId, {
      name,
      type: type as FieldType,
      required: Boolean(required),
      options: Array.isArray(options) ? options : undefined
    });
    return NextResponse.json({ field });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add field" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    const { fieldId } = await req.json();
    deleteField(user.id, sheetId, fieldId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete field" }, { status: 400 });
  }
}
