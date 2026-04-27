import { NextRequest } from "next/server";
import { getUserByToken } from "@/lib/memoryDb";

// Demo-only bearer token auth helper. Not production-safe.
export function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  return getUserByToken(token);
}
