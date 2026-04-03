"use server";

import { getServerAuthContext } from "@/lib/auth-server";
import { getProposalsByIdeaUuid } from "@/services/proposal.service";
import { listTasks } from "@/services/task.service";

export async function getProposalsForIdeaAction(
  projectUuid: string,
  ideaUuid: string,
) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false as const, error: "Unauthorized" };
  }

  const proposals = await getProposalsByIdeaUuid(
    auth.companyUuid,
    projectUuid,
    ideaUuid,
  );

  return { success: true as const, data: proposals };
}

export async function getTasksForProposalAction(
  projectUuid: string,
  proposalUuid: string,
) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { tasks } = await listTasks({
    companyUuid: auth.companyUuid,
    projectUuid,
    proposalUuids: [proposalUuid],
    skip: 0,
    take: 100,
  });

  return { success: true as const, data: tasks };
}
