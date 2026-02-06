// src/services/task.service.ts
// Task 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { formatAssigneeComplete, formatCreatedBy } from "@/lib/uuid-resolver";

// ===== 类型定义 =====

export interface TaskListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  status?: string;
  priority?: string;
}

export interface TaskCreateParams {
  companyUuid: string;
  projectUuid: string;
  title: string;
  description?: string | null;
  priority?: string;
  storyPoints?: number | null;
  proposalUuid?: string | null;
  createdByUuid: string;
}

export interface TaskClaimParams {
  taskUuid: string;
  companyUuid: string;
  assigneeType: string;
  assigneeUuid: string;
  assignedByUuid?: string | null;
}

export interface TaskUpdateParams {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  storyPoints?: number | null;
}

// API 响应格式
export interface TaskResponse {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  storyPoints: number | null;
  assignee: {
    type: string;
    uuid: string;
    name: string;
    assignedAt: string | null;
    assignedBy: { type: string; uuid: string; name: string } | null;
  } | null;
  proposalUuid: string | null;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Task 状态转换规则 (ARCHITECTURE.md §7.2)
export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["assigned", "closed"],
  assigned: ["open", "in_progress", "closed"],
  in_progress: ["to_verify", "closed"],
  to_verify: ["done", "in_progress", "closed"],
  done: ["closed"],
  closed: [],
};

// 验证状态转换是否有效
export function isValidTaskStatusTransition(from: string, to: string): boolean {
  const allowed = TASK_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ===== 内部辅助函数 =====

// 格式化单个 Task 为 API 响应格式
async function formatTaskResponse(
  task: {
    uuid: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    storyPoints: number | null;
    assigneeType: string | null;
    assigneeUuid: string | null;
    assignedAt: Date | null;
    assignedByUuid: string | null;
    proposalUuid: string | null;
    createdByUuid: string;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
  }
): Promise<TaskResponse> {
  const [assignee, createdBy] = await Promise.all([
    formatAssigneeComplete(task.assigneeType, task.assigneeUuid, task.assignedAt, task.assignedByUuid),
    formatCreatedBy(task.createdByUuid),
  ]);

  return {
    uuid: task.uuid,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    storyPoints: task.storyPoints,
    assignee,
    proposalUuid: task.proposalUuid,
    ...(task.project && { project: task.project }),
    createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// ===== Service 方法 =====

// Tasks 列表查询
export async function listTasks({
  companyUuid,
  projectUuid,
  skip,
  take,
  status,
  priority,
}: TaskListParams): Promise<{ tasks: TaskResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    ...(status && { status }),
    ...(priority && { priority }),
  };

  const [rawTasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        storyPoints: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.task.count({ where }),
  ]);

  const tasks = await Promise.all(rawTasks.map(formatTaskResponse));
  return { tasks, total };
}

// 获取 Task 详情
export async function getTask(
  companyUuid: string,
  uuid: string
): Promise<TaskResponse | null> {
  const task = await prisma.task.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  if (!task) return null;
  return formatTaskResponse(task);
}

// 通过 UUID 获取 Task 原始数据（内部使用，用于权限检查等）
export async function getTaskByUuid(companyUuid: string, uuid: string) {
  return prisma.task.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Task
export async function createTask(params: TaskCreateParams): Promise<TaskResponse> {
  const task = await prisma.task.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      title: params.title,
      description: params.description,
      status: "open",
      priority: params.priority || "medium",
      storyPoints: params.storyPoints,
      proposalUuid: params.proposalUuid,
      createdByUuid: params.createdByUuid,
    },
    select: {
      uuid: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      storyPoints: true,
      assigneeType: true,
      assigneeUuid: true,
      assignedAt: true,
      assignedByUuid: true,
      proposalUuid: true,
      createdByUuid: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatTaskResponse(task);
}

// 更新 Task
export async function updateTask(
  uuid: string,
  data: TaskUpdateParams
): Promise<TaskResponse> {
  const task = await prisma.task.update({
    where: { uuid },
    data,
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatTaskResponse(task);
}

// 认领 Task
export async function claimTask({
  taskUuid,
  companyUuid,
  assigneeType,
  assigneeUuid,
  assignedByUuid,
}: TaskClaimParams): Promise<TaskResponse> {
  const task = await prisma.task.update({
    where: { uuid: taskUuid },
    data: {
      status: "assigned",
      assigneeType,
      assigneeUuid,
      assignedAt: new Date(),
      assignedByUuid,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatTaskResponse(task);
}

// 放弃认领 Task
export async function releaseTask(uuid: string): Promise<TaskResponse> {
  const task = await prisma.task.update({
    where: { uuid },
    data: {
      status: "open",
      assigneeType: null,
      assigneeUuid: null,
      assignedAt: null,
      assignedByUuid: null,
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatTaskResponse(task);
}

// 删除 Task
export async function deleteTask(uuid: string) {
  return prisma.task.delete({ where: { uuid } });
}

// 批量创建 Tasks（用于 Proposal 审批）
export async function createTasksFromProposal(
  companyUuid: string,
  projectUuid: string,
  proposalUuid: string,
  createdByUuid: string,
  tasks: Array<{ title: string; description?: string; priority?: string; storyPoints?: number }>
): Promise<TaskResponse[]> {
  const createPromises = tasks.map((task) =>
    prisma.task.create({
      data: {
        companyUuid,
        projectUuid,
        title: task.title,
        description: task.description || null,
        status: "open",
        priority: task.priority || "medium",
        storyPoints: task.storyPoints || null,
        proposalUuid,
        createdByUuid,
      },
      select: {
        uuid: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        storyPoints: true,
        assigneeType: true,
        assigneeUuid: true,
        assignedAt: true,
        assignedByUuid: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  );

  const rawTasks = await Promise.all(createPromises);
  return Promise.all(rawTasks.map(formatTaskResponse));
}
