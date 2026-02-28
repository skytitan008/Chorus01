// src/app/api/proposals/[uuid]/reject/route.ts
// Proposals API - Reject Proposal (ARCHITECTURE.md §7.4)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { getProposalByUuid, rejectProposal } from "@/services/proposal.service";
import { createActivity } from "@/services/activity.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// POST /api/proposals/[uuid]/reject - Reject Proposal
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // Only users can reject
    if (!isUser(auth)) {
      return errors.forbidden("Only users can reject proposals");
    }

    const { uuid } = await context.params;

    const proposal = await getProposalByUuid(auth.companyUuid, uuid);
    if (!proposal) {
      return errors.notFound("Proposal");
    }

    // Only pending Proposals can be rejected
    if (proposal.status !== "pending") {
      return errors.badRequest("Can only reject pending proposals");
    }

    const body = await parseBody<{
      reviewNote?: string;
    }>(request);

    // A reason must be provided when rejecting
    if (!body.reviewNote || body.reviewNote.trim() === "") {
      return errors.validationError({
        reviewNote: "Review note is required when rejecting",
      });
    }

    const updated = await rejectProposal(
      proposal.uuid,
      auth.actorUuid,
      body.reviewNote.trim()
    );

    await createActivity({
      companyUuid: auth.companyUuid,
      projectUuid: proposal.projectUuid,
      targetType: "proposal",
      targetUuid: proposal.uuid,
      actorType: "user",
      actorUuid: auth.actorUuid,
      action: "rejected_to_draft",
      value: { reviewNote: body.reviewNote.trim() },
    });

    return success(updated);
  }
);
