// src/app/api/proposals/[uuid]/close/route.ts
// Proposals API - 关闭 Proposal (终态)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { getProposalByUuid, closeProposal } from "@/services/proposal.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/proposals/[uuid]/close - 关闭 Proposal
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以关闭
    if (!isUser(auth)) {
      return errors.forbidden("Only users can close proposals");
    }

    const { uuid } = await context.params;

    const proposal = await getProposalByUuid(auth.companyUuid, uuid);
    if (!proposal) {
      return errors.notFound("Proposal");
    }

    // 只有 pending 状态的 Proposal 可以关闭
    if (proposal.status !== "pending") {
      return errors.badRequest("Can only close pending proposals");
    }

    const body = await parseBody<{
      reviewNote?: string;
    }>(request);

    // 关闭时必须提供原因
    if (!body.reviewNote || body.reviewNote.trim() === "") {
      return errors.validationError({
        reviewNote: "Review note is required when closing",
      });
    }

    const updated = await closeProposal(
      proposal.uuid,
      auth.actorUuid,
      body.reviewNote.trim()
    );

    return success(updated);
  }
);
