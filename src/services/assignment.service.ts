// src/services/assignment.service.ts
// Assignment 服务层 - Agent 自助查询 (PRD §5.4)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/types/auth";
import { isAgent } from "@/lib/auth";
import { formatAssignee, formatCreatedBy } from "@/lib/uuid-resolver";

// ===== 类型定义 =====

// 认领的 Idea 响应格式
export interface AssignedIdeaResponse {
  uuid: string;
  title: string;
  content: string | null;
  status: string;
  assignee: { type: string; uuid: string; name: string } | null;
  assignedAt: string | null;
  project: { uuid: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// 认领的 Task 响应格式
export interface AssignedTaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { type: string; uuid: string; name: string } | null;
  assignedAt: string | null;
  project: { uuid: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// 可认领的 Idea 响应格式
export interface AvailableIdeaResponse {
  uuid: string;
  title: string;
  content: string | null;
  status: string;
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
}

// 可认领的 Task 响应格式
export interface AvailableTaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
}

// 我的认领响应
export interface MyAssignmentsResponse {
  ideas: AssignedIdeaResponse[];
  tasks: AssignedTaskResponse[];
}

// 可认领项目响应
export interface AvailableItemsResponse {
  ideas: AvailableIdeaResponse[];
  tasks: AvailableTaskResponse[];
}

// ===== 内部辅助函数 =====

// 获取当前用户/Agent 的认领条件
function getAssignmentConditions(auth: AuthContext) {
  const conditions: Array<{ assigneeType: string; assigneeUuid: string }> = [];

  if (isAgent(auth)) {
    // Agent 直接认领的
    conditions.push({ assigneeType: "agent", assigneeUuid: auth.actorUuid });
    // Agent 的 Owner 认领的（"Assign to myself"）
    if (auth.ownerUuid) {
      conditions.push({ assigneeType: "user", assigneeUuid: auth.ownerUuid });
    }
  } else {
    // 用户直接认领的
    conditions.push({ assigneeType: "user", assigneeUuid: auth.actorUuid });
  }

  return conditions;
}

// 格式化认领的 Idea
async function formatAssignedIdea(idea: {
  uuid: string;
  title: string;
  content: string | null;
  status: string;
  assigneeType: string | null;
  assigneeUuid: string | null;
  assignedAt: Date | null;
  project: { uuid: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}): Promise<AssignedIdeaResponse> {
  const assignee = await formatAssignee(idea.assigneeType, idea.assigneeUuid);

  return {
    uuid: idea.uuid,
    title: idea.title,
    content: idea.content,
    status: idea.status,
    assignee,
    assignedAt: idea.assignedAt?.toISOString() ?? null,
    project: idea.project,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}

// 格式化认领的 Task
async function formatAssignedTask(task: {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeType: string | null;
  assigneeUuid: string | null;
  assignedAt: Date | null;
  project: { uuid: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}): Promise<AssignedTaskResponse> {
  const assignee = await formatAssignee(task.assigneeType, task.assigneeUuid);

  return {
    uuid: task.uuid,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee,
    assignedAt: task.assignedAt?.toISOString() ?? null,
    project: task.project,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// 格式化可认领的 Idea
async function formatAvailableIdea(idea: {
  uuid: string;
  title: string;
  content: string | null;
  status: string;
  createdByUuid: string;
  createdAt: Date;
}): Promise<AvailableIdeaResponse> {
  const createdBy = await formatCreatedBy(idea.createdByUuid);

  return {
    uuid: idea.uuid,
    title: idea.title,
    content: idea.content,
    status: idea.status,
    createdBy,
    createdAt: idea.createdAt.toISOString(),
  };
}

// 格式化可认领的 Task
async function formatAvailableTask(task: {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdByUuid: string;
  createdAt: Date;
}): Promise<AvailableTaskResponse> {
  const createdBy = await formatCreatedBy(task.createdByUuid);

  return {
    uuid: task.uuid,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    createdBy,
    createdAt: task.createdAt.toISOString(),
  };
}

// ===== Service 方法 =====

// 获取自己认领的 Ideas + Tasks
export async function getMyAssignments(auth: AuthContext): Promise<MyAssignmentsResponse> {
  const conditions = getAssignmentConditions(auth);

  const [rawIdeas, rawTasks] = await Promise.all([
    // 获取认领的 Ideas
    prisma.idea.findMany({
      where: {
        companyUuid: auth.companyUuid,
        OR: conditions,
        status: { notIn: ["completed", "closed"] },
      },
      select: {
        uuid: true,
        title: true,
        content: true,
        status: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        project: { select: { uuid: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { assignedAt: "desc" },
    }),
    // 获取认领的 Tasks
    prisma.task.findMany({
      where: {
        companyUuid: auth.companyUuid,
        OR: conditions,
        status: { notIn: ["done", "closed"] },
      },
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        project: { select: { uuid: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ priority: "desc" }, { assignedAt: "desc" }],
    }),
  ]);

  const [ideas, tasks] = await Promise.all([
    Promise.all(rawIdeas.map(formatAssignedIdea)),
    Promise.all(rawTasks.map(formatAssignedTask)),
  ]);

  return { ideas, tasks };
}

// 获取项目中可认领的 Ideas + Tasks
export async function getAvailableItems(
  companyUuid: string,
  projectUuid: string,
  canClaimIdeas: boolean,
  canClaimTasks: boolean
): Promise<AvailableItemsResponse> {
  const baseWhere = { projectUuid, companyUuid, status: "open" };

  const [rawIdeas, rawTasks] = await Promise.all([
    canClaimIdeas
      ? prisma.idea.findMany({
          where: baseWhere,
          select: {
            uuid: true,
            title: true,
            content: true,
            status: true,
            createdByUuid: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
    canClaimTasks
      ? prisma.task.findMany({
          where: baseWhere,
          select: {
            uuid: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdByUuid: true,
            createdAt: true,
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 50,
        })
      : [],
  ]);

  const [ideas, tasks] = await Promise.all([
    Promise.all(rawIdeas.map(formatAvailableIdea)),
    Promise.all(rawTasks.map(formatAvailableTask)),
  ]);

  return { ideas, tasks };
}
