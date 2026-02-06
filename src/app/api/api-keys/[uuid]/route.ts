// src/app/api/api-keys/[uuid]/route.ts
// API Keys API - 撤销 (ARCHITECTURE.md §5.1, §9.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ uuid: string }> };

// DELETE /api/api-keys/[uuid] - 撤销 API Key
export const DELETE = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以撤销 API Key
    if (!isUser(auth)) {
      return errors.forbidden("Only users can revoke API keys");
    }

    const { uuid } = await context.params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { uuid, companyUuid: auth.companyUuid },
      select: { uuid: true, revokedAt: true },
    });

    if (!apiKey) {
      return errors.notFound("API Key");
    }

    if (apiKey.revokedAt) {
      return errors.badRequest("API Key is already revoked");
    }

    await prisma.apiKey.update({
      where: { uuid: apiKey.uuid },
      data: { revokedAt: new Date() },
    });

    return success({ revoked: true });
  }
);
