// src/app/api/projects/[uuid]/documents/route.ts
// Documents API - 列表和创建 (ARCHITECTURE.md §5.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody, parsePagination } from "@/lib/api-handler";
import { success, paginated, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import { listDocuments, createDocument } from "@/services/document.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/documents - Documents 列表
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
    const typeFilter = url.searchParams.get("type") || undefined;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const { documents, total } = await listDocuments({
      companyUuid: auth.companyUuid,
      projectUuid,
      skip,
      take,
      type: typeFilter,
    });

    return paginated(documents, page, pageSize, total);
  }
);

// POST /api/projects/[uuid]/documents - 创建 Document
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以直接创建 Document
    if (!isUser(auth)) {
      return errors.forbidden("Only users can create documents directly");
    }

    const { uuid: projectUuid } = await context.params;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const body = await parseBody<{
      type: string;
      title: string;
      content?: string;
    }>(request);

    // 验证必填字段
    if (!body.type || body.type.trim() === "") {
      return errors.validationError({ type: "Type is required" });
    }
    if (!body.title || body.title.trim() === "") {
      return errors.validationError({ title: "Title is required" });
    }

    const document = await createDocument({
      companyUuid: auth.companyUuid,
      projectUuid,
      type: body.type.trim(),
      title: body.title.trim(),
      content: body.content?.trim() || null,
      createdByUuid: auth.actorUuid,
    });

    return success(document);
  }
);
