import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/memoryDb";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const { token, user } = loginUser(email, password);
    return NextResponse.json({ token, user: { id: user.id, email: user.email }, warning: "Demo-only auth: not production-safe." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 });
  }
}
