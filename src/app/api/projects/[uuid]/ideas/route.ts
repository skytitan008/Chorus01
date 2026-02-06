// src/app/api/projects/[uuid]/ideas/route.ts
// Ideas API - 列表和创建 (ARCHITECTURE.md §5.1, PRD §4.1 F5)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody, parsePagination } from "@/lib/api-handler";
import { success, paginated, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import { listIdeas, createIdea } from "@/services/idea.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/ideas - Ideas 列表
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

    const { ideas, total } = await listIdeas({
      companyUuid: auth.companyUuid,
      projectUuid,
      skip,
      take,
      status: statusFilter,
    });

    return paginated(ideas, page, pageSize, total);
  }
);

// POST /api/projects/[uuid]/ideas - 创建 Idea
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以创建 Idea
    if (!isUser(auth)) {
      return errors.forbidden("Only users can create ideas");
    }

    const { uuid: projectUuid } = await context.params;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const body = await parseBody<{
      title: string;
      content?: string;
      attachments?: unknown;
    }>(request);

    // 验证必填字段
    if (!body.title || body.title.trim() === "") {
      return errors.validationError({ title: "Title is required" });
    }

    const idea = await createIdea({
      companyUuid: auth.companyUuid,
      projectUuid,
      title: body.title.trim(),
      content: body.content?.trim() || null,
      attachments: body.attachments,
      createdByUuid: auth.actorUuid,
    });

    return success(idea);
  }
);
