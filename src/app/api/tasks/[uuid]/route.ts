// src/app/api/tasks/[uuid]/route.ts
// Tasks API - 详情、更新、删除 (ARCHITECTURE.md §5.1, §7.2)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAssignee } from "@/lib/auth";
import {
  getTask,
  getTaskByUuid,
  updateTask,
  deleteTask,
  isValidTaskStatusTransition,
} from "@/services/task.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/tasks/[uuid] - Task 详情
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;
    const task = await getTask(auth.companyUuid, uuid);

    if (!task) {
      return errors.notFound("Task");
    }

    return success(task);
  }
);

// PATCH /api/tasks/[uuid] - 更新 Task
export const PATCH = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;

    // 获取原始 Task 数据用于权限检查
    const task = await getTaskByUuid(auth.companyUuid, uuid);
    if (!task) {
      return errors.notFound("Task");
    }

    const body = await parseBody<{
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      storyPoints?: number | null;
    }>(request);

    // 构建更新数据
    const updateData: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      storyPoints?: number | null;
    } = {};

    // 标题验证
    if (body.title !== undefined) {
      if (body.title.trim() === "") {
        return errors.validationError({ title: "Title cannot be empty" });
      }
      updateData.title = body.title.trim();
    }

    // 描述更新
    if (body.description !== undefined) {
      updateData.description = body.description.trim() || null;
    }

    // 优先级验证
    if (body.priority !== undefined) {
      const validPriorities = ["low", "medium", "high"];
      if (!validPriorities.includes(body.priority)) {
        return errors.validationError({
          priority: "Priority must be low, medium, or high",
        });
      }
      updateData.priority = body.priority;
    }

    // Story Points 验证（单位：Agent 小时）
    if (body.storyPoints !== undefined) {
      if (body.storyPoints !== null && (body.storyPoints < 0 || body.storyPoints > 1000)) {
        return errors.validationError({
          storyPoints: "Story points must be between 0 and 1000 agent hours",
        });
      }
      updateData.storyPoints = body.storyPoints;
    }

    // 状态更新
    if (body.status !== undefined) {
      // 检查状态转换是否有效
      if (!isValidTaskStatusTransition(task.status, body.status)) {
        return errors.invalidStatusTransition(task.status, body.status);
      }

      // 非用户只能更新自己认领的 Task 状态
      if (!isUser(auth)) {
        if (!isAssignee(auth, task.assigneeType, task.assigneeUuid)) {
          return errors.permissionDenied("Only assignee can update status");
        }
      }

      updateData.status = body.status;
    }

    const updated = await updateTask(task.uuid, updateData);
    return success(updated);
  }
);

// DELETE /api/tasks/[uuid] - 删除 Task
export const DELETE = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以删除 Task
    if (!isUser(auth)) {
      return errors.forbidden("Only users can delete tasks");
    }

    const { uuid } = await context.params;

    const task = await getTaskByUuid(auth.companyUuid, uuid);
    if (!task) {
      return errors.notFound("Task");
    }

    await deleteTask(task.uuid);
    return success({ deleted: true });
  }
);
