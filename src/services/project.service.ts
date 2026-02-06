// src/services/project.service.ts
// Project 服务层 (ARCHITECTURE.md §3.1 Service Layer)
// UUID-Based Architecture: All operations use UUIDs

import { prisma } from "@/lib/prisma";

export interface ProjectListParams {
  companyUuid: string;
  skip: number;
  take: number;
}

export interface ProjectCreateParams {
  companyUuid: string;
  name: string;
  description?: string | null;
}

export interface ProjectUpdateParams {
  name?: string;
  description?: string | null;
}

// 项目列表查询
export async function listProjects({ companyUuid, skip, take }: ProjectListParams) {
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { companyUuid },
      skip,
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        uuid: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ideas: true,
            documents: true,
            tasks: true,
            proposals: true,
          },
        },
      },
    }),
    prisma.project.count({ where: { companyUuid } }),
  ]);

  return { projects, total };
}

// 获取项目详情
export async function getProject(companyUuid: string, uuid: string) {
  return prisma.project.findFirst({
    where: { uuid, companyUuid },
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          ideas: true,
          documents: true,
          tasks: true,
          proposals: true,
          activities: true,
        },
      },
    },
  });
}

// 验证项目是否存在
export async function projectExists(companyUuid: string, projectUuid: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { uuid: projectUuid, companyUuid },
    select: { uuid: true },
  });
  return !!project;
}

// 通过 UUID 获取项目基本信息
export async function getProjectByUuid(companyUuid: string, uuid: string) {
  return prisma.project.findFirst({
    where: { uuid, companyUuid },
    select: { uuid: true, name: true },
  });
}

// 创建项目
export async function createProject({ companyUuid, name, description }: ProjectCreateParams) {
  return prisma.project.create({
    data: { companyUuid, name, description },
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// 更新项目
export async function updateProject(uuid: string, data: ProjectUpdateParams) {
  return prisma.project.update({
    where: { uuid },
    data,
    select: {
      uuid: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// 删除项目
export async function deleteProject(uuid: string) {
  return prisma.project.delete({ where: { uuid } });
}
