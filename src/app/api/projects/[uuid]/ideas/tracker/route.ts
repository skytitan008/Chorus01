// src/app/api/projects/[uuid]/ideas/tracker/route.ts
// Idea Tracker API - Returns ideas grouped by derived status
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { success, errors } from "@/lib/api-response";
import { getAuthContext } from "@/lib/auth";
import { projectExists } from "@/services/project.service";
import {
  getIdeasWithDerivedStatus,
  DerivedIdeaStatus,
  BadgeHint,
} from "@/services/idea.service";


type RouteContext = { params: Promise<{ uuid: string }> };

// The 4 tracker columns (closed is excluded from the board view)
const TRACKER_STATUSES: DerivedIdeaStatus[] = [
  "todo",
  "in_progress",
  "human_conduct_required",
  "done",
];

// GET /api/projects/[uuid]/ideas/tracker - Ideas grouped by derived status
export const GET = withErrorHandler<{ uuid: string }>(
  async (request: NextRequest, context: RouteContext) => {
    const auth = await getAuthContext(request);
    if (!auth) {
      return errors.unauthorized();
    }

    const { uuid: projectUuid } = await context.params;

    // Validate project exists
    if (!(await projectExists(auth.companyUuid, projectUuid))) {
      return errors.notFound("Project");
    }

    // Get ideas with derived statuses (3 batch queries, no N+1)
    const ideas = await getIdeasWithDerivedStatus(
      auth.companyUuid,
      projectUuid
    );

    // Group ideas by derivedStatus
    const groups: Record<string, Array<{
      uuid: string;
      title: string;
      status: string;
      derivedStatus: DerivedIdeaStatus;
      badgeHint: BadgeHint;
      createdAt: string;
    }>> = {};
    const counts: Record<string, number> = {};

    for (const status of TRACKER_STATUSES) {
      groups[status] = [];
      counts[status] = 0;
    }

    for (const idea of ideas) {
      const ds = idea.derivedStatus;
      // Skip closed ideas — they don't appear on the tracker board
      if (ds === "closed") continue;

      const formatted = {
        uuid: idea.uuid,
        title: idea.title,
        status: idea.status,
        derivedStatus: ds,
        badgeHint: idea.badgeHint,
        createdAt: idea.createdAt.toISOString(),
      };

      if (groups[ds]) {
        groups[ds].push(formatted);
        counts[ds]++;
      }
    }

    return success({ groups, counts });
  }
);
