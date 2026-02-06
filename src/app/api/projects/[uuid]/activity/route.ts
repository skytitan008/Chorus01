// src/app/api/projects/[uuid]/activity/route.ts
// Activity API - 项目活动流 (ARCHITECTURE.md §4.2)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, parsePagination } from "@/lib/api-handler";
import { paginated, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/activity - 项目活动流
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid: projectUuid } = await context.params;
    const { page, pageSize, skip, take } = parsePagination(request);

    // 查找项目 (query by UUID)
    const project = await prisma.project.findFirst({
      where: { uuid: projectUuid, companyUuid: auth.companyUuid },
      select: { uuid: true },
    });

    if (!project) {
      return errors.notFound("Project");
    }

    const where = {
      projectUuid: project.uuid,
      companyUuid: auth.companyUuid,
    };

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

    const data = activities.map((a) => ({
      uuid: a.uuid,
      references: {
        ideaUuid: a.ideaUuid,
        documentUuid: a.documentUuid,
        proposalUuid: a.proposalUuid,
        taskUuid: a.taskUuid,
      },
      actor: {
        type: a.actorType,
        uuid: a.actorUuid,
      },
      action: a.action,
      payload: a.payload,
      createdAt: a.createdAt.toISOString(),
    }));

    return paginated(data, page, pageSize, total);
  }
);
