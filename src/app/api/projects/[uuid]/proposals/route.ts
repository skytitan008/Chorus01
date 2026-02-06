// src/app/api/projects/[uuid]/proposals/route.ts
// Proposals API - 列表和创建 (ARCHITECTURE.md §5.1, PRD §4.1 F5)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody, parsePagination } from "@/lib/api-handler";
import { success, paginated, errors } from "@/lib/api-response";
import { getAuthContext, isAgent, isPmAgent } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import { listProposals, createProposal } from "@/services/proposal.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/proposals - Proposals 列表
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid: projectUuid } = await context.params;
    const { page, pageSize, skip, take } = parsePagination(request);

    // 解析筛选参数
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || undefined;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const { proposals, total } = await listProposals({
      companyUuid: auth.companyUuid,
      projectUuid,
      skip,
      take,
      status: statusFilter,
    });

    return paginated(proposals, page, pageSize, total);
  }
);

// POST /api/projects/[uuid]/proposals - 创建 Proposal
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有 PM Agent 可以创建 Proposal
    if (!isAgent(auth) || !isPmAgent(auth)) {
      return errors.forbidden("Only PM agents can create proposals");
    }

    const { uuid: projectUuid } = await context.params;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const body = await parseBody<{
      title: string;
      description?: string;
      inputType: "idea" | "document";
      inputUuids: string[];  // Accept UUIDs directly
      outputType: "document" | "task";
      outputData: unknown;
    }>(request);

    // 验证必填字段
    if (!body.title || body.title.trim() === "") {
      return errors.validationError({ title: "Title is required" });
    }
    if (!body.inputType || !["idea", "document"].includes(body.inputType)) {
      return errors.validationError({ inputType: "Invalid input type" });
    }
    if (!body.inputUuids || !Array.isArray(body.inputUuids) || body.inputUuids.length === 0) {
      return errors.validationError({ inputUuids: "Input UUIDs are required" });
    }
    if (!body.outputType || !["document", "task"].includes(body.outputType)) {
      return errors.validationError({ outputType: "Invalid output type" });
    }
    if (!body.outputData) {
      return errors.validationError({ outputData: "Output data is required" });
    }

    // Store UUIDs directly - no conversion needed in UUID-based architecture
    const proposal = await createProposal({
      companyUuid: auth.companyUuid,
      projectUuid,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      inputType: body.inputType,
      inputUuids: body.inputUuids,  // Store UUIDs directly
      outputType: body.outputType,
      outputData: body.outputData,
      createdByUuid: auth.actorUuid,
    });

    return success(proposal);
  }
);
