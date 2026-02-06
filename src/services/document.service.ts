// src/services/document.service.ts
// Document 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";
import { formatCreatedBy } from "@/lib/uuid-resolver";

// ===== 类型定义 =====

export interface DocumentListParams {
  companyUuid: string;
  projectUuid: string;
  skip: number;
  take: number;
  type?: string;
}

export interface DocumentCreateParams {
  companyUuid: string;
  projectUuid: string;
  type: string;
  title: string;
  content?: string | null;
  proposalUuid?: string | null;
  createdByUuid: string;
}

export interface DocumentUpdateParams {
  title?: string;
  content?: string | null;
  incrementVersion?: boolean;
}

// API 响应格式
export interface DocumentResponse {
  uuid: string;
  type: string;
  title: string;
  content?: string | null;
  version: number;
  proposalUuid: string | null;
  project?: { uuid: string; name: string };
  createdBy: { type: string; uuid: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 内部辅助函数 =====

// 格式化单个 Document 为 API 响应格式
async function formatDocumentResponse(
  doc: {
    uuid: string;
    type: string;
    title: string;
    content?: string | null;
    version: number;
    proposalUuid: string | null;
    createdByUuid: string;
    createdAt: Date;
    updatedAt: Date;
    project?: { uuid: string; name: string };
  },
  includeContent = false
): Promise<DocumentResponse> {
  const createdBy = await formatCreatedBy(doc.createdByUuid);

  const response: DocumentResponse = {
    uuid: doc.uuid,
    type: doc.type,
    title: doc.title,
    version: doc.version,
    proposalUuid: doc.proposalUuid,
    createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  if (includeContent && doc.content !== undefined) {
    response.content = doc.content;
  }

  if (doc.project) {
    response.project = doc.project;
  }

  return response;
}

// ===== Service 方法 =====

// Documents 列表查询
export async function listDocuments({
  companyUuid,
  projectUuid,
  skip,
  take,
  type,
}: DocumentListParams): Promise<{ documents: DocumentResponse[]; total: number }> {
  const where = {
    projectUuid,
    companyUuid,
    ...(type && { type }),
  };

  const [rawDocuments, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        uuid: true,
        type: true,
        title: true,
        version: true,
        proposalUuid: true,
        createdByUuid: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  const documents = await Promise.all(
    rawDocuments.map((doc) => formatDocumentResponse(doc))
  );
  return { documents, total };
}

// 获取 Document 详情
export async function getDocument(
  companyUuid: string,
  uuid: string
): Promise<DocumentResponse | null> {
  const doc = await prisma.document.findFirst({
    where: { uuid, companyUuid },
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  if (!doc) return null;
  return formatDocumentResponse(doc, true);
}

// 通过 UUID 获取 Document 原始数据（内部使用）
export async function getDocumentByUuid(companyUuid: string, uuid: string) {
  return prisma.document.findFirst({
    where: { uuid, companyUuid },
  });
}

// 创建 Document
export async function createDocument(
  params: DocumentCreateParams
): Promise<DocumentResponse> {
  const doc = await prisma.document.create({
    data: {
      companyUuid: params.companyUuid,
      projectUuid: params.projectUuid,
      type: params.type,
      title: params.title,
      content: params.content,
      version: 1,
      proposalUuid: params.proposalUuid,
      createdByUuid: params.createdByUuid,
    },
    select: {
      uuid: true,
      type: true,
      title: true,
      content: true,
      version: true,
      proposalUuid: true,
      createdByUuid: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatDocumentResponse(doc, true);
}

// 更新 Document
export async function updateDocument(
  uuid: string,
  { title, content, incrementVersion }: DocumentUpdateParams
): Promise<DocumentResponse> {
  const data: { title?: string; content?: string | null; version?: { increment: number } } = {};

  if (title !== undefined) {
    data.title = title;
  }
  if (content !== undefined) {
    data.content = content;
  }
  if (incrementVersion) {
    data.version = { increment: 1 };
  }

  const doc = await prisma.document.update({
    where: { uuid },
    data,
    include: {
      project: { select: { uuid: true, name: true } },
    },
  });

  return formatDocumentResponse(doc, true);
}

// 删除 Document
export async function deleteDocument(uuid: string) {
  return prisma.document.delete({ where: { uuid } });
}

// 从 Proposal 创建 Document
export async function createDocumentFromProposal(
  companyUuid: string,
  projectUuid: string,
  proposalUuid: string,
  createdByUuid: string,
  doc: { type: string; title: string; content?: string }
): Promise<DocumentResponse> {
  const created = await prisma.document.create({
    data: {
      companyUuid,
      projectUuid,
      type: doc.type || "prd",
      title: doc.title,
      content: doc.content || null,
      version: 1,
      proposalUuid,
      createdByUuid,
    },
    select: {
      uuid: true,
      type: true,
      title: true,
      content: true,
      version: true,
      proposalUuid: true,
      createdByUuid: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return formatDocumentResponse(created, true);
}
