import { NextRequest } from "next/server";
import { getUserByToken } from "@/lib/memoryDb";

export function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? null;
  return getUserByToken(token);
}
