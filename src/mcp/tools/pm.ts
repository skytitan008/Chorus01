// src/mcp/tools/pm.ts
// PM Agent 专属 MCP 工具 (ARCHITECTURE.md §5.2)
// UUID-Based Architecture: All operations use UUIDs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentAuthContext } from "@/types/auth";
import { projectExists } from "@/services/project.service";
import * as ideaService from "@/services/idea.service";
import * as proposalService from "@/services/proposal.service";
import * as documentService from "@/services/document.service";
import * as taskService from "@/services/task.service";

export function registerPmTools(server: McpServer, auth: AgentAuthContext) {
  // chorus_claim_idea - 认领 Idea
  server.registerTool(
    "chorus_claim_idea",
    {
      description: "认领一个 Idea（open → assigned）",
      inputSchema: z.object({
        ideaUuid: z.string().describe("Idea UUID"),
      }),
    },
    async ({ ideaUuid }) => {
      const idea = await ideaService.getIdeaByUuid(auth.companyUuid, ideaUuid);
      if (!idea) {
        return { content: [{ type: "text", text: "Idea 不存在" }], isError: true };
      }

      if (idea.status !== "open") {
        return { content: [{ type: "text", text: "只能认领 open 状态的 Idea" }], isError: true };
      }

      const updated = await ideaService.claimIdea({
        ideaUuid: idea.uuid,
        companyUuid: auth.companyUuid,
        assigneeType: "agent",
        assigneeUuid: auth.actorUuid,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_release_idea - 放弃认领 Idea
  server.registerTool(
    "chorus_release_idea",
    {
      description: "放弃认领 Idea（assigned → open）",
      inputSchema: z.object({
        ideaUuid: z.string().describe("Idea UUID"),
      }),
    },
    async ({ ideaUuid }) => {
      const idea = await ideaService.getIdeaByUuid(auth.companyUuid, ideaUuid);
      if (!idea) {
        return { content: [{ type: "text", text: "Idea 不存在" }], isError: true };
      }

      if (idea.status !== "assigned") {
        return { content: [{ type: "text", text: "只能放弃 assigned 状态的 Idea" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (idea.assigneeType === "agent" && idea.assigneeUuid === auth.actorUuid) ||
        (idea.assigneeType === "user" && auth.ownerUuid && idea.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以放弃认领" }], isError: true };
      }

      const updated = await ideaService.releaseIdea(idea.uuid);

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_update_idea_status - 更新 Idea 状态
  server.registerTool(
    "chorus_update_idea_status",
    {
      description: "更新 Idea 状态（仅认领者可操作）",
      inputSchema: z.object({
        ideaUuid: z.string().describe("Idea UUID"),
        status: z.enum(["in_progress", "pending_review", "completed"]).describe("新状态"),
      }),
    },
    async ({ ideaUuid, status }) => {
      const idea = await ideaService.getIdeaByUuid(auth.companyUuid, ideaUuid);
      if (!idea) {
        return { content: [{ type: "text", text: "Idea 不存在" }], isError: true };
      }

      // 检查是否是认领者 (UUID comparison)
      const isAssignee =
        (idea.assigneeType === "agent" && idea.assigneeUuid === auth.actorUuid) ||
        (idea.assigneeType === "user" && auth.ownerUuid && idea.assigneeUuid === auth.ownerUuid);

      if (!isAssignee) {
        return { content: [{ type: "text", text: "只有认领者可以更新状态" }], isError: true };
      }

      // 验证状态转换
      if (!ideaService.isValidIdeaStatusTransition(idea.status, status)) {
        return {
          content: [{ type: "text", text: `无效的状态转换: ${idea.status} → ${status}` }],
          isError: true,
        };
      }

      const updated = await ideaService.updateIdea(idea.uuid, auth.companyUuid, { status });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_pm_create_proposal - 创建提议
  server.registerTool(
    "chorus_pm_create_proposal",
    {
      description: "创建提议（PRD/任务拆分/技术方案）",
      inputSchema: z.object({
        projectUuid: z.string().describe("项目 UUID"),
        title: z.string().describe("提议标题"),
        description: z.string().optional().describe("提议描述"),
        inputType: z.enum(["idea", "document"]).describe("输入类型"),
        inputUuids: z.array(z.string()).describe("输入 UUID 列表"),
        outputType: z.enum(["document", "task"]).describe("输出类型"),
        outputData: z.record(z.string(), z.unknown()).describe("输出数据（Document 草稿或 Task 列表）"),
      }),
    },
    async ({ projectUuid, title, description, inputType, inputUuids, outputType, outputData }) => {
      // 验证项目存在
      if (!(await projectExists(auth.companyUuid, projectUuid))) {
        return { content: [{ type: "text", text: "项目不存在" }], isError: true };
      }

      // Store UUIDs directly - no ID conversion needed
      const proposal = await proposalService.createProposal({
        companyUuid: auth.companyUuid,
        projectUuid,
        title,
        description,
        inputType,
        inputUuids,  // UUIDs stored directly
        outputType,
        outputData,
        createdByUuid: auth.actorUuid,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(proposal, null, 2) }],
      };
    }
  );

  // chorus_pm_create_document - 创建文档
  server.registerTool(
    "chorus_pm_create_document",
    {
      description: "创建文档（PRD、技术设计、ADR 等）",
      inputSchema: z.object({
        projectUuid: z.string().describe("项目 UUID"),
        type: z.enum(["prd", "tech_design", "adr", "spec", "guide"]).describe("文档类型"),
        title: z.string().describe("文档标题"),
        content: z.string().optional().describe("文档内容（Markdown）"),
        proposalUuid: z.string().optional().describe("关联的 Proposal UUID（可选）"),
      }),
    },
    async ({ projectUuid, type, title, content, proposalUuid }) => {
      // 验证项目存在
      if (!(await projectExists(auth.companyUuid, projectUuid))) {
        return { content: [{ type: "text", text: "项目不存在" }], isError: true };
      }

      // 验证 Proposal 存在（如果提供）
      if (proposalUuid) {
        const proposal = await proposalService.getProposalByUuid(auth.companyUuid, proposalUuid);
        if (!proposal) {
          return { content: [{ type: "text", text: "Proposal 不存在" }], isError: true };
        }
      }

      const document = await documentService.createDocument({
        companyUuid: auth.companyUuid,
        projectUuid,
        type,
        title,
        content: content || null,
        proposalUuid: proposalUuid || null,
        createdByUuid: auth.actorUuid,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(document, null, 2) }],
      };
    }
  );

  // chorus_pm_create_tasks - 批量创建任务
  server.registerTool(
    "chorus_pm_create_tasks",
    {
      description: "批量创建任务（可关联 Proposal）",
      inputSchema: z.object({
        projectUuid: z.string().describe("项目 UUID"),
        proposalUuid: z.string().optional().describe("关联的 Proposal UUID（可选）"),
        tasks: z.array(z.object({
          title: z.string().describe("任务标题"),
          description: z.string().optional().describe("任务描述"),
          priority: z.enum(["low", "medium", "high"]).optional().describe("优先级"),
          storyPoints: z.number().optional().describe("工作量估算（Agent 小时）"),
        })).describe("任务列表"),
      }),
    },
    async ({ projectUuid, proposalUuid, tasks }) => {
      // 验证项目存在
      if (!(await projectExists(auth.companyUuid, projectUuid))) {
        return { content: [{ type: "text", text: "项目不存在" }], isError: true };
      }

      // 验证 Proposal 存在（如果提供）
      if (proposalUuid) {
        const proposal = await proposalService.getProposalByUuid(auth.companyUuid, proposalUuid);
        if (!proposal) {
          return { content: [{ type: "text", text: "Proposal 不存在" }], isError: true };
        }
      }

      // 批量创建任务
      const createdTasks = await Promise.all(
        tasks.map(task =>
          taskService.createTask({
            companyUuid: auth.companyUuid,
            projectUuid,
            title: task.title,
            description: task.description || null,
            priority: task.priority,
            storyPoints: task.storyPoints || null,
            proposalUuid: proposalUuid || null,
            createdByUuid: auth.actorUuid,
          })
        )
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ tasks: createdTasks, count: createdTasks.length }, null, 2) }],
      };
    }
  );

  // chorus_pm_update_document - 更新文档内容
  server.registerTool(
    "chorus_pm_update_document",
    {
      description: "更新文档内容（会增加版本号）",
      inputSchema: z.object({
        documentUuid: z.string().describe("文档 UUID"),
        title: z.string().optional().describe("新标题"),
        content: z.string().optional().describe("新内容（Markdown）"),
      }),
    },
    async ({ documentUuid, title, content }) => {
      const doc = await documentService.getDocument(auth.companyUuid, documentUuid);
      if (!doc) {
        return { content: [{ type: "text", text: "文档不存在" }], isError: true };
      }

      const updated = await documentService.updateDocument(documentUuid, {
        title,
        content,
        incrementVersion: true,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );
}
