// src/app/api/proposals/[uuid]/route.ts
// Proposals API - 详情 (ARCHITECTURE.md §5.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";
import { getProposal } from "@/services/proposal.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/proposals/[uuid] - Proposal 详情
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;
    const proposal = await getProposal(auth.companyUuid, uuid);

    if (!proposal) {
      return errors.notFound("Proposal");
    }

    return success(proposal);
  }
);
