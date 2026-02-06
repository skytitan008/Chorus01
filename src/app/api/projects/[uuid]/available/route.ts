// src/app/api/projects/[uuid]/available/route.ts
// Agent 自助 API - 获取可认领的 Ideas + Tasks (PRD §5.4)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isAgent, isPmAgent, isDeveloperAgent } from "@/lib/auth";
import { getProjectByUuid } from "@/services/project.service";
import { getAvailableItems } from "@/services/assignment.service";

type RouteContext = { params: Promise<{ uuid: string }> };

// GET /api/projects/[uuid]/available - 获取可认领的 Ideas + Tasks
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid: projectUuid } = await context.params;

    // 查找项目
    const project = await getProjectByUuid(auth.companyUuid, projectUuid);
    if (!project) {
      return errors.notFound("Project");
    }

    // 根据角色返回不同内容
    // PM Agent: 可认领 Ideas
    // Developer Agent: 可认领 Tasks
    // User: 可看到所有
    const canClaimIdeas = isAgent(auth) ? isPmAgent(auth) : true;
    const canClaimTasks = isAgent(auth) ? isDeveloperAgent(auth) : true;

    const result = await getAvailableItems(
      auth.companyUuid,
      projectUuid,
      canClaimIdeas,
      canClaimTasks
    );

    return success({
      project: {
        uuid: project.uuid,
        name: project.name,
      },
      ...result,
    });
  }
);
