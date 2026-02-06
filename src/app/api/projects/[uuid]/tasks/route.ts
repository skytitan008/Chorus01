// src/app/api/projects/[uuid]/tasks/route.ts
// Tasks API - 列表和创建 (ARCHITECTURE.md §5.1, PRD §3.3.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody, parsePagination } from "@/lib/api-handler";
import { success, paginated, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isPmAgent } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import { listTasks, createTask } from "@/services/task.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/tasks - Tasks 列表
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
    const priorityFilter = url.searchParams.get("priority") || undefined;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const { tasks, total } = await listTasks({
      companyUuid: auth.companyUuid,
      projectUuid,
      skip,
      take,
      status: statusFilter,
      priority: priorityFilter,
    });

    return paginated(tasks, page, pageSize, total);
  }
);

// POST /api/projects/[uuid]/tasks - 创建 Task
export const POST = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 用户和 PM Agent 可以创建 Task
    if (!isUser(auth) && !isPmAgent(auth)) {
      return errors.forbidden("Only users and PM agents can create tasks");
    }

    const { uuid: projectUuid } = await context.params;

    // 验证项目存在
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    const body = await parseBody<{
      title: string;
      description?: string;
      priority?: string;
      storyPoints?: number;
    }>(request);

    // 验证必填字段
    if (!body.title || body.title.trim() === "") {
      return errors.validationError({ title: "Title is required" });
    }

    // 验证优先级
    const validPriorities = ["low", "medium", "high"];
    const priority = body.priority || "medium";
    if (!validPriorities.includes(priority)) {
      return errors.validationError({
        priority: "Priority must be low, medium, or high",
      });
    }

    // 验证 storyPoints（单位：Agent 小时）
    const storyPoints = body.storyPoints;
    if (storyPoints !== undefined && (storyPoints < 0 || storyPoints > 1000)) {
      return errors.validationError({
        storyPoints: "Story points must be between 0 and 1000 agent hours",
      });
    }

    const task = await createTask({
      companyUuid: auth.companyUuid,
      projectUuid,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority,
      storyPoints: storyPoints || null,
      createdByUuid: auth.actorUuid,
    });

    return success(task);
  }
);
