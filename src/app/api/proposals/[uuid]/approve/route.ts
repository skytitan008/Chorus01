// src/app/api/proposals/[uuid]/approve/route.ts
// Proposals API - 审批通过 (ARCHITECTURE.md §7.4)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { getProposalByUuid, approveProposal } from "@/services/proposal.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/proposals/[uuid]/approve - 审批通过 Proposal
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以审批
    if (!isUser(auth)) {
      return errors.forbidden("Only users can approve proposals");
    }

    const { uuid } = await context.params;

    const proposal = await getProposalByUuid(auth.companyUuid, uuid);
    if (!proposal) {
      return errors.notFound("Proposal");
    }

    // 只有 pending 状态的 Proposal 可以审批
    if (proposal.status !== "pending") {
      return errors.badRequest("Can only approve pending proposals");
    }

    const body = await parseBody<{
      reviewNote?: string;
    }>(request);

    const updated = await approveProposal(
      proposal.uuid,
      auth.companyUuid,
      auth.actorUuid,
      body.reviewNote
    );

    return success(updated);
  }
);
