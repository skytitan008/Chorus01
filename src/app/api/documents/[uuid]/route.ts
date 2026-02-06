// src/app/api/documents/[uuid]/route.ts
// Documents API - 详情、更新、删除 (ARCHITECTURE.md §5.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import {
  getDocument,
  getDocumentByUuid,
  updateDocument,
  deleteDocument,
} from "@/services/document.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/documents/[uuid] - Document 详情
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid } = await context.params;
    const document = await getDocument(auth.companyUuid, uuid);

    if (!document) {
      return errors.notFound("Document");
    }

    return success(document);
  }
);

// PATCH /api/documents/[uuid] - 更新 Document
export const PATCH = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以更新 Document
    if (!isUser(auth)) {
      return errors.forbidden("Only users can update documents");
    }

    const { uuid } = await context.params;

    // 获取原始 Document 数据
    const document = await getDocumentByUuid(auth.companyUuid, uuid);
    if (!document) {
      return errors.notFound("Document");
    }

    const body = await parseBody<{
      title?: string;
      content?: string;
      incrementVersion?: boolean;
    }>(request);

    // 验证标题
    if (body.title !== undefined && body.title.trim() === "") {
      return errors.validationError({ title: "Title cannot be empty" });
    }

    const updated = await updateDocument(document.uuid, {
      title: body.title?.trim(),
      content: body.content !== undefined ? (body.content.trim() || null) : undefined,
      incrementVersion: body.incrementVersion,
    });

    return success(updated);
  }
);

// DELETE /api/documents/[uuid] - 删除 Document
export const DELETE = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    // 只有用户可以删除 Document
    if (!isUser(auth)) {
      return errors.forbidden("Only users can delete documents");
    }

    const { uuid } = await context.params;

    const document = await getDocumentByUuid(auth.companyUuid, uuid);
    if (!document) {
      return errors.notFound("Document");
    }

    await deleteDocument(document.uuid);
    return success({ deleted: true });
  }
);
