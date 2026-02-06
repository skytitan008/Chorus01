// src/app/api/ideas/[uuid]/route.ts
// Ideas API - 详情、更新、删除 (ARCHITECTURE.md §5.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser, isAssignee } from "@/lib/auth";
import {
  getIdea,
  getIdeaByUuid,
  updateIdea,
  deleteIdea,
  isValidIdeaStatusTransition,
} from "@/services/idea.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/ideas/[uuid] - Idea 详情
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;
    const idea = await getIdea(auth.companyUuid, uuid);

    if (!idea) {
      return errors.notFound("Idea");
    }

    return success(idea);
  }
);

// PATCH /api/ideas/[uuid] - 更新 Idea
export const PATCH = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;

    // 获取原始 Idea 数据用于权限检查
    const idea = await getIdeaByUuid(auth.companyUuid, uuid);
    if (!idea) {
      return errors.notFound("Idea");
    }

    const body = await parseBody<{
      title?: string;
      content?: string;
      status?: string;
    }>(request);

    // 构建更新数据
    const updateData: {
      title?: string;
      content?: string | null;
      status?: string;
    } = {};

    // 标题验证
    if (body.title !== undefined) {
      if (body.title.trim() === "") {
        return errors.validationError({ title: "Title cannot be empty" });
      }
      updateData.title = body.title.trim();
    }

    // 内容更新
    if (body.content !== undefined) {
      updateData.content = body.content.trim() || null;
    }

    // 状态更新
    if (body.status !== undefined) {
      // 检查状态转换是否有效
      if (!isValidIdeaStatusTransition(idea.status, body.status)) {
        return errors.invalidStatusTransition(idea.status, body.status);
      }

      // 非用户只能更新自己认领的 Idea 状态
      if (!isUser(auth)) {
        if (!isAssignee(auth, idea.assigneeType, idea.assigneeUuid)) {
          return errors.permissionDenied("Only assignee can update status");
        }
      }

      updateData.status = body.status;
    }

    const updated = await updateIdea(idea.uuid, auth.companyUuid, updateData);
    return success(updated);
  }
);

// DELETE /api/ideas/[uuid] - 删除 Idea
export const DELETE = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以删除 Idea
    if (!isUser(auth)) {
      return errors.forbidden("Only users can delete ideas");
    }

    const { uuid } = await context.params;

    const idea = await getIdeaByUuid(auth.companyUuid, uuid);
    if (!idea) {
      return errors.notFound("Idea");
    }

    await deleteIdea(idea.uuid);
    return success({ deleted: true });
  }
);
