// src/services/proposal.service.ts
// Proposal 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { formatCreatedBy, formatReview } from "@/lib/uuid-resolver";
import { createDocumentFromProposal } from "./document.service";
import { createTasksFromProposal } from "./task.service";

// ===== 类型定义 =====

export interface ProposalListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  status?: string;
}

export interface ProposalCreateParams {
  companyUuid: string;
  projectUuid: string;
  title: string;
  description?: string | null;
  inputType: string;
  inputUuids: string[];  // UUID array (not numeric IDs)
  outputType: string;
  outputData: unknown;
  createdByUuid: string;
}

// 文档输出数据类型
interface DocumentOutputData {
  type: string;
  title: string;
  content: string;
}

// 任务输出数据类型
interface TaskOutputData {
  tasks: Array<{
    title: string;
    description?: string;
    priority?: string;
  }>;
}

// API 响应格式
export interface ProposalResponse {
  uuid: string;
  title: string;
  description: string | null;
  inputType: string;
  inputUuids: string[];
  outputType: string;
  outputData?: unknown;
  status: string;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  review: {
    reviewedBy: { type: string; uuid: string; name: string };
    reviewNote: string | null;
    reviewedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 内部辅助函数 =====

// 格式化单个 Proposal 为 API 响应格式
async function formatProposalResponse(
  proposal: {
    uuid: string;
    title: string;
    description: string | null;
    inputType: string;
    inputUuids: unknown;  // JSON field - array of UUID strings
    outputType: string;
    outputData?: unknown;
    status: string;
    createdByUuid: string;
    reviewedByUuid: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
  },
  includeOutputData = false
): Promise<ProposalResponse> {
  const [createdBy, review] = await Promise.all([
    formatCreatedBy(proposal.createdByUuid, "agent"), // Proposals 由 Agent 创建
    formatReview(proposal.reviewedByUuid, proposal.reviewNote, proposal.reviewedAt),
  ]);

  const response: ProposalResponse = {
    uuid: proposal.uuid,
    title: proposal.title,
    description: proposal.description,
    inputType: proposal.inputType,
    inputUuids: proposal.inputUuids as string[],  // Already UUIDs in database
    outputType: proposal.outputType,
    status: proposal.status,
    createdBy,
    review,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };

  if (includeOutputData && proposal.outputData !== undefined) {
    response.outputData = proposal.outputData;
  }

  if (proposal.project) {
    response.project = proposal.project;
  }

  return response;
}

// ===== Service 方法 =====

// Proposals 列表查询
export async function listProposals({
  companyUuid,
  projectUuid,
  skip,
  take,
  status,
}: ProposalListParams): Promise<{ proposals: ProposalResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    ...(status && { status }),
  };

  const [rawProposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        uuid: true,
        title: true,
        description: true,
        inputType: true,
        inputUuids: true,
        outputType: true,
        status: true,
        createdByUuid: true,
        reviewedByUuid: true,
        reviewNote: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.proposal.count({ where }),
  ]);

  const proposals = await Promise.all(
    rawProposals.map((p) => formatProposalResponse(p))
  );
  return { proposals, total };
}

// 获取 Proposal 详情
export async function getProposal(
  companyUuid: string,
  uuid: string
): Promise<ProposalResponse | null> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  if (!proposal) return null;
  return formatProposalResponse(proposal, true);
}

// 通过 UUID 获取 Proposal 原始数据（内部使用）
export async function getProposalByUuid(companyUuid: string, uuid: string) {
  return prisma.proposal.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Proposal
export async function createProposal(
  params: ProposalCreateParams
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      title: params.title,
      description: params.description,
      inputType: params.inputType,
      inputUuids: params.inputUuids,  // Store UUIDs directly
      outputType: params.outputType,
      outputData: params.outputData as object,
      status: "pending",
      createdByUuid: params.createdByUuid,
    },
    select: {
      uuid: true,
      title: true,
      description: true,
      inputType: true,
      inputUuids: true,
      outputType: true,
      outputData: true,
      status: true,
      createdByUuid: true,
      reviewedByUuid: true,
      reviewNote: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatProposalResponse(proposal, true);
}

// 审批通过 Proposal
export async function approveProposal(
  proposalUuid: string,
  companyUuid: string,
  reviewedByUuid: string,
  reviewNote?: string | null
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.findFirst({
    where: { uuid: proposalUuid, companyUuid },
  });

  if (!proposal) {
    throw new Error("Proposal not found");
  }

  // 开启事务处理
  const updatedProposal = await prisma.$transaction(async (tx) => {
    // 更新 Proposal 状态
    const updated = await tx.proposal.update({
      where: { uuid: proposalUuid },
      data: {
        status: "approved",
        reviewedByUuid,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
      include: {
        project: { select: { uuid: true, name: true } },
      },
    });

    // 根据 outputType 创建产物
    if (proposal.outputType === "document") {
      const outputData = proposal.outputData as unknown as DocumentOutputData;
      await createDocumentFromProposal(
        proposal.companyUuid,
        proposal.projectUuid,
        proposal.uuid,
        proposal.createdByUuid,
        outputData
      );
    } else if (proposal.outputType === "task") {
      const outputData = proposal.outputData as unknown as TaskOutputData;
      await createTasksFromProposal(
        proposal.companyUuid,
        proposal.projectUuid,
        proposal.uuid,
        proposal.createdByUuid,
        outputData.tasks || []
      );
    }

    return updated;
  });

  return formatProposalResponse(updatedProposal, true);
}

// 拒绝 Proposal
export async function rejectProposal(
  proposalUuid: string,
  reviewedByUuid: string,
  reviewNote: string
): Promise<ProposalResponse> {
  const proposal = await prisma.proposal.update({
    where: { uuid: proposalUuid },
    data: {
      status: "rejected",
      reviewedByUuid,
      reviewNote,
      reviewedAt: new Date(),
    },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatProposalResponse(proposal, true);
}
