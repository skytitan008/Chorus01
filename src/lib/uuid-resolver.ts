// src/lib/uuid-resolver.ts
// UUID 解析器 - 简化版 (UUID-Based Architecture)
// 大部分转换功能已不需要，仅保留格式化显示工具

import { prisma } from "@/lib/prisma";

export type TargetType = "idea" | "proposal" | "task" | "document";
export type ActorType = "user" | "agent";

// 根据 UUID 获取 Actor 名称（用于显示）
export async function getActorName(
  actorType: string,
  actorUuid: string
): Promise<string | null> {
  if (actorType === "user") {
    const user = await prisma.user.findUnique({
      where: { uuid: actorUuid },
      select: { name: true },
    });
    return user?.name ?? "Unknown";
  } else if (actorType === "agent") {
    const agent = await prisma.agent.findUnique({
      where: { uuid: actorUuid },
      select: { name: true },
    });
    return agent?.name ?? null;
  }
  return null;
}

// 格式化 assignee 信息（直接使用 UUID）
export async function formatAssignee(
  assigneeType: string | null,
  assigneeUuid: string | null
): Promise<{ type: string; uuid: string; name: string } | null> {
  if (!assigneeType || !assigneeUuid) return null;

  const name = await getActorName(assigneeType, assigneeUuid);
  if (!name) return null;

  return {
    type: assigneeType,
    uuid: assigneeUuid,
    name,
  };
}

// 格式化 createdBy 信息（直接使用 UUID）
// 如果未指定类型，会先尝试查找 user，再尝试 agent
export async function formatCreatedBy(
  createdByUuid: string,
  creatorType?: "user" | "agent"
): Promise<{ type: string; uuid: string; name: string } | null> {
  if (creatorType) {
    const name = await getActorName(creatorType, createdByUuid);
    if (!name) return null;
    return { type: creatorType, uuid: createdByUuid, name };
  }

  // 未指定类型，先尝试 user
  const user = await prisma.user.findUnique({
    where: { uuid: createdByUuid },
    select: { name: true },
  });
  if (user) {
    return { type: "user", uuid: createdByUuid, name: user.name ?? "Unknown" };
  }

  // 再尝试 agent
  const agent = await prisma.agent.findUnique({
    where: { uuid: createdByUuid },
    select: { name: true },
  });
  if (agent) {
    return { type: "agent", uuid: createdByUuid, name: agent.name };
  }

  return null;
}

// 完整的 assignee 格式化（包含 assignedAt 和 assignedBy）
export interface AssigneeInfo {
  type: string;
  uuid: string;
  name: string;
  assignedAt: string | null;
  assignedBy: { type: string; uuid: string; name: string } | null;
}

export async function formatAssigneeComplete(
  assigneeType: string | null,
  assigneeUuid: string | null,
  assignedAt: Date | null,
  assignedByUuid: string | null // assignedBy 总是 user
): Promise<AssigneeInfo | null> {
  if (!assigneeType || !assigneeUuid) return null;

  const assigneeName = await getActorName(assigneeType, assigneeUuid);
  if (!assigneeName) return null;

  let assignedByInfo: { type: string; uuid: string; name: string } | null = null;
  if (assignedByUuid) {
    const userName = await getActorName("user", assignedByUuid);
    if (userName) {
      assignedByInfo = {
        type: "user",
        uuid: assignedByUuid,
        name: userName,
      };
    }
  }

  return {
    type: assigneeType,
    uuid: assigneeUuid,
    name: assigneeName,
    assignedAt: assignedAt?.toISOString() ?? null,
    assignedBy: assignedByInfo,
  };
}

// 格式化 Proposal 的 review 信息
export interface ReviewInfo {
  reviewedBy: { type: string; uuid: string; name: string };
  reviewNote: string | null;
  reviewedAt: string | null;
}

export async function formatReview(
  reviewedByUuid: string | null,
  reviewNote: string | null,
  reviewedAt: Date | null
): Promise<ReviewInfo | null> {
  if (!reviewedByUuid) return null;

  const userName = await getActorName("user", reviewedByUuid);
  if (!userName) return null;

  return {
    reviewedBy: {
      type: "user",
      uuid: reviewedByUuid,
      name: userName,
    },
    reviewNote,
    reviewedAt: reviewedAt?.toISOString() ?? null,
  };
}

// 验证目标实体是否存在（直接使用 UUID）
export async function validateTargetExists(
  targetType: TargetType,
  targetUuid: string,
  companyUuid: string
): Promise<boolean> {
  const where = { uuid: targetUuid, companyUuid };

  switch (targetType) {
    case "idea":
      return !!(await prisma.idea.findFirst({ where, select: { uuid: true } }));
    case "proposal":
      return !!(await prisma.proposal.findFirst({ where, select: { uuid: true } }));
    case "task":
      return !!(await prisma.task.findFirst({ where, select: { uuid: true } }));
    case "document":
      return !!(await prisma.document.findFirst({ where, select: { uuid: true } }));
    default:
      return false;
  }
}
