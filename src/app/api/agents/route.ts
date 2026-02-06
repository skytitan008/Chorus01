// src/app/api/agents/route.ts
// Agents API - 列表和创建 (ARCHITECTURE.md §5.1)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, parseBody, parsePagination } from "@/lib/api-handler";
import { success, paginated, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";

// GET /api/agents - Agent 列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return errors.unauthorized();
  }

  // 只有用户可以查看 Agent 列表
  if (!isUser(auth)) {
    return errors.forbidden("Only users can view agents");
  }

  const { page, pageSize, skip, take } = parsePagination(request);

  const where = {
    companyUuid: auth.companyUuid,
  };

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        name: true,
        roles: true,
        persona: true,
        ownerUuid: true,
        lastActiveAt: true,
        createdAt: true,
        _count: {
          select: { apiKeys: true },
        },
      },
    }),
    prisma.agent.count({ where }),
  ]);

  const data = agents.map((a) => ({
    uuid: a.uuid,
    name: a.name,
    roles: a.roles,
    persona: a.persona,
    ownerUuid: a.ownerUuid,
    lastActiveAt: a.lastActiveAt?.toISOString() || null,
    apiKeyCount: a._count.apiKeys,
    createdAt: a.createdAt.toISOString(),
  }));

  return paginated(data, page, pageSize, total);
});

// POST /api/agents - 创建 Agent
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await getAuthContext(request);
  if (!auth) {
    return errors.unauthorized();
  }

  // 只有用户可以创建 Agent
  if (!isUser(auth)) {
    return errors.forbidden("Only users can create agents");
  }

  const body = await parseBody<{
    name: string;
    roles?: string[];
    persona?: string | null;
    systemPrompt?: string | null;
  }>(request);

  // 验证必填字段
  if (!body.name || body.name.trim() === "") {
    return errors.validationError({ name: "Name is required" });
  }

  // 验证角色
  const validRoles = ["pm_agent", "developer_agent", "admin_agent", "pm", "developer", "admin"];
  const roles = body.roles || ["developer_agent"];
  for (const role of roles) {
    if (!validRoles.includes(role)) {
      return errors.validationError({
        roles: "Roles must be pm_agent, developer_agent, or admin_agent",
      });
    }
  }

  const agent = await prisma.agent.create({
    data: {
      companyUuid: auth.companyUuid,
      name: body.name.trim(),
      roles,
      persona: body.persona?.trim() || null,
      systemPrompt: body.systemPrompt?.trim() || null,
      ownerUuid: auth.actorUuid,
    },
    select: {
      uuid: true,
      name: true,
      roles: true,
      persona: true,
      systemPrompt: true,
      ownerUuid: true,
      createdAt: true,
    },
  });

  return success({
    uuid: agent.uuid,
    name: agent.name,
    roles: agent.roles,
    persona: agent.persona,
    systemPrompt: agent.systemPrompt,
    ownerUuid: agent.ownerUuid,
    lastActiveAt: null,
    apiKeyCount: 0,
    createdAt: agent.createdAt.toISOString(),
  });
});
