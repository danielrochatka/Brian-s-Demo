import { NextRequest, NextResponse } from "next/server";
import { addField, deleteField, FieldType, supportedFieldTypes } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

type Params = Promise<{ sheetId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    if (!sheetId) return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    const { name, type, required, options } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Field name is required" }, { status: 400 });
    if (!type || !supportedFieldTypes.includes(type as FieldType)) {
      return NextResponse.json({ error: "Unsupported field type" }, { status: 400 });
    }
    const field = addField(user.id, sheetId, {
      name: name.trim(),
      type: type as FieldType,
      required: Boolean(required),
      options:
        type === "dropdown" && Array.isArray(options)
          ? options.map((opt) => String(opt).trim()).filter(Boolean)
          : undefined
    });
    return NextResponse.json({ field });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add field";
    const status = message === "Forbidden" ? 403 : message === "Sheet not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sheetId } = await params;
    if (!sheetId) return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    const { fieldId } = await req.json();
    if (!fieldId) return NextResponse.json({ error: "fieldId is required" }, { status: 400 });
    deleteField(user.id, sheetId, fieldId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete field";
    const status =
      message === "Forbidden" ? 403 : message === "Sheet not found" || message === "Field not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
