// src/mcp/tools/admin.ts
// Admin Agent 专属 MCP 工具 (ARCHITECTURE.md §5.2)
// Admin Agent 代理人类执行审批、验证、项目管理等操作
// UUID-Based Architecture: All operations use UUIDs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AgentAuthContext } from "@/types/auth";
import * as projectService from "@/services/project.service";
import * as proposalService from "@/services/proposal.service";
import * as taskService from "@/services/task.service";
import * as ideaService from "@/services/idea.service";
import * as documentService from "@/services/document.service";

export function registerAdminTools(server: McpServer, auth: AgentAuthContext) {
  // chorus_admin_create_project - 创建新项目
  server.registerTool(
    "chorus_admin_create_project",
    {
      description: "创建新项目（Admin 专属，代理人类操作）",
      inputSchema: z.object({
        name: z.string().describe("项目名称"),
        description: z.string().optional().describe("项目描述"),
      }),
    },
    async ({ name, description }) => {
      const project = await projectService.createProject({
        companyUuid: auth.companyUuid,
        name,
        description: description || null,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    }
  );

  // chorus_admin_create_idea - 创建 Idea（代理人类提出需求）
  server.registerTool(
    "chorus_admin_create_idea",
    {
      description: "创建 Idea（Admin 专属，代理人类提出需求）",
      inputSchema: z.object({
        projectUuid: z.string().describe("项目 UUID"),
        title: z.string().describe("Idea 标题"),
        content: z.string().optional().describe("Idea 详细描述"),
      }),
    },
    async ({ projectUuid, title, content }) => {
      // 验证项目存在
      const project = await projectService.getProject(auth.companyUuid, projectUuid);
      if (!project) {
        return { content: [{ type: "text", text: "项目不存在" }], isError: true };
      }

      const idea = await ideaService.createIdea({
        companyUuid: auth.companyUuid,
        projectUuid,
        title,
        content: content || null,
        createdByUuid: auth.actorUuid,  // Admin Agent 作为创建者
      });

      return {
        content: [{ type: "text", text: JSON.stringify(idea, null, 2) }],
      };
    }
  );

  // chorus_admin_approve_proposal - 审批通过 Proposal
  server.registerTool(
    "chorus_admin_approve_proposal",
    {
      description: "审批通过 Proposal（Admin 专属，代理人类审批）",
      inputSchema: z.object({
        proposalUuid: z.string().describe("Proposal UUID"),
        reviewNote: z.string().optional().describe("审批备注"),
      }),
    },
    async ({ proposalUuid, reviewNote }) => {
      const proposal = await proposalService.getProposalByUuid(auth.companyUuid, proposalUuid);
      if (!proposal) {
        return { content: [{ type: "text", text: "Proposal 不存在" }], isError: true };
      }

      if (proposal.status !== "pending") {
        return { content: [{ type: "text", text: `只能审批 pending 状态的 Proposal，当前状态: ${proposal.status}` }], isError: true };
      }

      const updated = await proposalService.approveProposal(
        proposalUuid,
        auth.companyUuid,
        auth.actorUuid,  // Admin Agent 作为审批者
        reviewNote || null
      );

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_admin_reject_proposal - 拒绝 Proposal
  server.registerTool(
    "chorus_admin_reject_proposal",
    {
      description: "拒绝 Proposal（Admin 专属，代理人类审批）",
      inputSchema: z.object({
        proposalUuid: z.string().describe("Proposal UUID"),
        reviewNote: z.string().describe("拒绝原因（必填）"),
      }),
    },
    async ({ proposalUuid, reviewNote }) => {
      const proposal = await proposalService.getProposalByUuid(auth.companyUuid, proposalUuid);
      if (!proposal) {
        return { content: [{ type: "text", text: "Proposal 不存在" }], isError: true };
      }

      if (proposal.status !== "pending") {
        return { content: [{ type: "text", text: `只能拒绝 pending 状态的 Proposal，当前状态: ${proposal.status}` }], isError: true };
      }

      const updated = await proposalService.rejectProposal(
        proposalUuid,
        auth.actorUuid,  // Admin Agent 作为审批者
        reviewNote
      );

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_admin_verify_task - 验证 Task（to_verify → done）
  server.registerTool(
    "chorus_admin_verify_task",
    {
      description: "验证 Task（to_verify → done，Admin 专属，代理人类验证）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      if (task.status !== "to_verify") {
        return { content: [{ type: "text", text: `只能验证 to_verify 状态的 Task，当前状态: ${task.status}` }], isError: true };
      }

      const updated = await taskService.updateTask(task.uuid, { status: "done" });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_admin_reopen_task - 重新打开 Task（to_verify → in_progress）
  server.registerTool(
    "chorus_admin_reopen_task",
    {
      description: "重新打开 Task（to_verify → in_progress，验证不通过时使用）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      if (task.status !== "to_verify") {
        return { content: [{ type: "text", text: `只能重新打开 to_verify 状态的 Task，当前状态: ${task.status}` }], isError: true };
      }

      const updated = await taskService.updateTask(task.uuid, { status: "in_progress" });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_admin_close_task - 关闭 Task（any → closed）
  server.registerTool(
    "chorus_admin_close_task",
    {
      description: "关闭 Task（任何状态 → closed，Admin 专属）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      if (task.status === "closed") {
        return { content: [{ type: "text", text: "Task 已经是 closed 状态" }], isError: true };
      }

      const updated = await taskService.updateTask(task.uuid, { status: "closed" });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // chorus_admin_delete_idea - 删除 Idea
  server.registerTool(
    "chorus_admin_delete_idea",
    {
      description: "删除 Idea（Admin 专属，可删除任意 Idea）",
      inputSchema: z.object({
        ideaUuid: z.string().describe("Idea UUID"),
      }),
    },
    async ({ ideaUuid }) => {
      const idea = await ideaService.getIdeaByUuid(auth.companyUuid, ideaUuid);
      if (!idea) {
        return { content: [{ type: "text", text: "Idea 不存在" }], isError: true };
      }

      await ideaService.deleteIdea(ideaUuid);

      return {
        content: [{ type: "text", text: `Idea ${ideaUuid} 已删除` }],
      };
    }
  );

  // chorus_admin_delete_task - 删除 Task
  server.registerTool(
    "chorus_admin_delete_task",
    {
      description: "删除 Task（Admin 专属，可删除任意 Task）",
      inputSchema: z.object({
        taskUuid: z.string().describe("Task UUID"),
      }),
    },
    async ({ taskUuid }) => {
      const task = await taskService.getTaskByUuid(auth.companyUuid, taskUuid);
      if (!task) {
        return { content: [{ type: "text", text: "Task 不存在" }], isError: true };
      }

      await taskService.deleteTask(taskUuid);

      return {
        content: [{ type: "text", text: `Task ${taskUuid} 已删除` }],
      };
    }
  );

  // chorus_admin_delete_document - 删除 Document
  server.registerTool(
    "chorus_admin_delete_document",
    {
      description: "删除 Document（Admin 专属，可删除任意 Document）",
      inputSchema: z.object({
        documentUuid: z.string().describe("Document UUID"),
      }),
    },
    async ({ documentUuid }) => {
      const doc = await documentService.getDocument(auth.companyUuid, documentUuid);
      if (!doc) {
        return { content: [{ type: "text", text: "Document 不存在" }], isError: true };
      }

      await documentService.deleteDocument(documentUuid);

      return {
        content: [{ type: "text", text: `Document ${documentUuid} 已删除` }],
      };
    }
  );

  // chorus_admin_close_idea - 关闭 Idea（any → closed）
  server.registerTool(
    "chorus_admin_close_idea",
    {
      description: "关闭 Idea（任何状态 → closed，Admin 专属）",
      inputSchema: z.object({
        ideaUuid: z.string().describe("Idea UUID"),
      }),
    },
    async ({ ideaUuid }) => {
      const idea = await ideaService.getIdeaByUuid(auth.companyUuid, ideaUuid);
      if (!idea) {
        return { content: [{ type: "text", text: "Idea 不存在" }], isError: true };
      }

      if (idea.status === "closed") {
        return { content: [{ type: "text", text: "Idea 已经是 closed 状态" }], isError: true };
      }

      const updated = await ideaService.updateIdea(ideaUuid, auth.companyUuid, { status: "closed" });

      return {
        content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
      };
    }
  );
}
