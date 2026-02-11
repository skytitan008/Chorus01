// src/services/session.service.ts
// Agent Session 服务层 — 子会话管理（swarm 模式可观测性）
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";

// ===== 类型定义 =====

export interface SessionCreateParams {
  companyUuid: string;
  agentUuid: string;
  name: string;
  description?: string | null;
  expiresAt?: Date | null;
}

export interface SessionCheckinInfo {
  taskUuid: string;
  checkinAt: string;
  checkoutAt: string | null;
}

export interface SessionResponse {
  uuid: string;
  agentUuid: string;
  name: string;
  description: string | null;
  status: string;
  lastActiveAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  checkins: SessionCheckinInfo[];
}

export interface TaskSessionInfo {
  sessionUuid: string;
  sessionName: string;
  agentUuid: string;
  agentName: string;
  checkinAt: string;
}

// ===== 内部辅助函数 =====

function formatSessionResponse(
  session: {
    uuid: string;
    agentUuid: string;
    name: string;
    description: string | null;
    status: string;
    lastActiveAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    taskCheckins?: Array<{
      taskUuid: string;
      checkinAt: Date;
      checkoutAt: Date | null;
    }>;
  }
): SessionResponse {
  return {
    uuid: session.uuid,
    agentUuid: session.agentUuid,
    name: session.name,
    description: session.description,
    status: session.status,
    lastActiveAt: session.lastActiveAt.toISOString(),
    expiresAt: session.expiresAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    checkins: (session.taskCheckins || []).map((c) => ({
      taskUuid: c.taskUuid,
      checkinAt: c.checkinAt.toISOString(),
      checkoutAt: c.checkoutAt?.toISOString() ?? null,
    })),
  };
}

// ===== Service 方法 =====

// 创建 Session
export async function createSession(params: SessionCreateParams): Promise<SessionResponse> {
  const session = await prisma.agentSession.create({
    data: {
      companyUuid: params.companyUuid,
      agentUuid: params.agentUuid,
      name: params.name,
      description: params.description ?? null,
      status: "active",
      expiresAt: params.expiresAt ?? null,
    },
  });

  return formatSessionResponse(session);
}

// 获取 Session 详情（含活跃 checkins）
export async function getSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse | null> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  if (!session) return null;
  return formatSessionResponse(session);
}

// 列出 Agent 的 Sessions
export async function listAgentSessions(
  companyUuid: string,
  agentUuid: string,
  status?: string
): Promise<SessionResponse[]> {
  const sessions = await prisma.agentSession.findMany({
    where: {
      companyUuid,
      agentUuid,
      ...(status && { status }),
    },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map(formatSessionResponse);
}

// 关闭 Session（status→closed，批量 checkout 所有 checkins）
export async function closeSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });

  if (!session) throw new Error("Session not found");

  // Query active checkins before batch checkout for event emission
  const activeCheckins = await prisma.sessionTaskCheckin.findMany({
    where: { sessionUuid, checkoutAt: null },
    select: { task: { select: { uuid: true, projectUuid: true } } },
  });

  // 批量 checkout 所有活跃 checkins
  await prisma.sessionTaskCheckin.updateMany({
    where: { sessionUuid, checkoutAt: null },
    data: { checkoutAt: new Date() },
  });

  const updated = await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: { status: "closed" },
    include: {
      taskCheckins: {
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  for (const checkin of activeCheckins) {
    eventBus.emitChange({ companyUuid: session.companyUuid, projectUuid: checkin.task.projectUuid, entityType: "task", entityUuid: checkin.task.uuid, action: "updated" });
  }

  return formatSessionResponse(updated);
}

// Session checkin 到 Task
export async function sessionCheckinToTask(
  companyUuid: string,
  sessionUuid: string,
  taskUuid: string
): Promise<SessionCheckinInfo> {
  // 验证 session 存在且属于该公司
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid, status: "active" },
  });
  if (!session) throw new Error("Session not found or not active");

  // 验证 task 存在且属于该公司
  const task = await prisma.task.findFirst({
    where: { uuid: taskUuid, companyUuid },
  });
  if (!task) throw new Error("Task not found");

  // Upsert: 如果已存在则重新激活
  const checkin = await prisma.sessionTaskCheckin.upsert({
    where: {
      sessionUuid_taskUuid: { sessionUuid, taskUuid },
    },
    create: { sessionUuid, taskUuid },
    update: { checkoutAt: null, checkinAt: new Date() },
  });

  // 更新 lastActiveAt
  await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: { lastActiveAt: new Date() },
  });

  eventBus.emitChange({ companyUuid, projectUuid: task.projectUuid, entityType: "task", entityUuid: taskUuid, action: "updated" });

  return {
    taskUuid: checkin.taskUuid,
    checkinAt: checkin.checkinAt.toISOString(),
    checkoutAt: checkin.checkoutAt?.toISOString() ?? null,
  };
}

// Session checkout from Task
export async function sessionCheckoutFromTask(
  companyUuid: string,
  sessionUuid: string,
  taskUuid: string
): Promise<void> {
  // 验证 session 属于该公司
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });
  if (!session) throw new Error("Session not found");

  const task = await prisma.task.findFirst({
    where: { uuid: taskUuid, companyUuid },
    select: { projectUuid: true },
  });

  await prisma.sessionTaskCheckin.updateMany({
    where: { sessionUuid, taskUuid, checkoutAt: null },
    data: { checkoutAt: new Date() },
  });

  if (task) {
    eventBus.emitChange({ companyUuid, projectUuid: task.projectUuid, entityType: "task", entityUuid: taskUuid, action: "updated" });
  }
}

// 获取 Task 上所有活跃 Sessions
export async function getSessionsForTask(
  companyUuid: string,
  taskUuid: string
): Promise<TaskSessionInfo[]> {
  const checkins = await prisma.sessionTaskCheckin.findMany({
    where: {
      taskUuid,
      checkoutAt: null,
      session: { companyUuid, status: { in: ["active", "inactive"] } },
    },
    include: {
      session: {
        select: {
          uuid: true,
          name: true,
          agentUuid: true,
          agent: { select: { name: true } },
        },
      },
    },
  });

  return checkins.map((c) => ({
    sessionUuid: c.session.uuid,
    sessionName: c.session.name,
    agentUuid: c.session.agentUuid,
    agentName: c.session.agent.name,
    checkinAt: c.checkinAt.toISOString(),
  }));
}

// 心跳更新 lastActiveAt
export async function heartbeatSession(
  companyUuid: string,
  sessionUuid: string
): Promise<void> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });
  if (!session) throw new Error("Session not found");

  await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: {
      lastActiveAt: new Date(),
      // 如果是 inactive 状态，心跳后恢复为 active
      ...(session.status === "inactive" && { status: "active" }),
    },
  });
}

// 重新打开已关闭的 Session（closed → active）
export async function reopenSession(
  companyUuid: string,
  sessionUuid: string
): Promise<SessionResponse> {
  const session = await prisma.agentSession.findFirst({
    where: { uuid: sessionUuid, companyUuid },
  });

  if (!session) throw new Error("Session not found");
  if (session.status !== "closed") throw new Error("Only closed sessions can be reopened");

  const updated = await prisma.agentSession.update({
    where: { uuid: sessionUuid },
    data: {
      status: "active",
      lastActiveAt: new Date(),
    },
    include: {
      taskCheckins: {
        where: { checkoutAt: null },
        select: { taskUuid: true, checkinAt: true, checkoutAt: true },
      },
    },
  });

  return formatSessionResponse(updated);
}

// 批量标记不活跃 sessions（1 小时无心跳）
export async function markInactiveSessions(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await prisma.agentSession.updateMany({
    where: {
      status: "active",
      lastActiveAt: { lt: oneHourAgo },
    },
    data: { status: "inactive" },
  });

  return result.count;
}

// 获取 Session 名称（用于 Activity 显示）
export async function getSessionName(sessionUuid: string): Promise<string | null> {
  const session = await prisma.agentSession.findUnique({
    where: { uuid: sessionUuid },
    select: { name: true },
  });
  return session?.name ?? null;
}
