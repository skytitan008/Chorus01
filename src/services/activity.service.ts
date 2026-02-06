// src/services/activity.service.ts
// Activity 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";

export interface ActivityListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
}

export interface ActivityCreateParams {
  companyUuid: string;
  projectUuid: string;
  actorType: string;
  actorUuid: string;
  action: string;
  ideaUuid?: string | null;
  documentUuid?: string | null;
  proposalUuid?: string | null;
  taskUuid?: string | null;
  payload?: unknown;
}

// Activities 列表查询
export async function listActivities({
  companyUuid,
  projectUuid,
  skip,
  take,
}: ActivityListParams) {
  const where = { projectUuid, companyUuid };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        ideaUuid: true,
        documentUuid: true,
        proposalUuid: true,
        taskUuid: true,
        actorType: true,
        actorUuid: true,
        action: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, total };
}

// 创建 Activity
export async function createActivity({
  companyUuid,
  projectUuid,
  actorType,
  actorUuid,
  action,
  ideaUuid,
  documentUuid,
  proposalUuid,
  taskUuid,
  payload,
}: ActivityCreateParams) {
  return prisma.activity.create({
    data: {
      companyUuid,
      projectUuid,
      actorType,
      actorUuid,
      action,
      ideaUuid,
      documentUuid,
      proposalUuid,
      taskUuid,
      payload: payload || undefined,
    },
  });
}
