// src/app/api/me/assignments/route.ts
// Agent 自助 API - 获取自己认领的 Ideas + Tasks (PRD §5.4)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";
import { getMyAssignments } from "@/services/assignment.service";

// GET /api/me/assignments - 获取自己认领的 Ideas + Tasks
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return errors.unauthorized();
  }

  const result = await getMyAssignments(auth);
  return success(result);
});
