import { NextRequest, NextResponse } from "next/server";
import { createSampleCheckbook } from "@/lib/memoryDb";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sheet = createSampleCheckbook(user.id);
  return NextResponse.json({ sheet });
}
