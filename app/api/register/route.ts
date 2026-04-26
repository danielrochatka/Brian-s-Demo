import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/memoryDb";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const user = registerUser(email, password);
    return NextResponse.json({ id: user.id, email: user.email, warning: "Demo-only auth: passwords are stored in-memory and plain text." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to register" }, { status: 400 });
  }
}
