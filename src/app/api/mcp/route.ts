// src/app/api/mcp/route.ts
// MCP HTTP 端点 (ARCHITECTURE.md §5.2)
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/server";
import { extractApiKey, validateApiKey } from "@/lib/api-key";
import type { AgentAuthContext } from "@/types/auth";

// 存储会话的 transport 实例
const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

// 生成会话 ID
function generateSessionId(): string {
  return crypto.randomUUID();
}

// POST /api/mcp - MCP HTTP 端点
export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const authHeader = request.headers.get("authorization");
    const apiKey = extractApiKey(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing or invalid API key" },
        { status: 401 }
      );
    }

    const validation = await validateApiKey(apiKey);
    if (!validation.valid || !validation.agent) {
      return NextResponse.json(
        { error: validation.error || "Invalid API key" },
        { status: 401 }
      );
    }

    // 构建认证上下文 (UUID-based)
    const auth: AgentAuthContext = {
      type: "agent",
      companyUuid: validation.agent.companyUuid,
      actorUuid: validation.agent.uuid,
      roles: validation.agent.roles as ("pm" | "developer")[],
      ownerUuid: validation.agent.ownerUuid ?? undefined,
      agentName: validation.agent.name,
    };

    // 检查会话 ID
    const sessionId = request.headers.get("mcp-session-id");

    let transport: WebStandardStreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      // 复用现有会话
      transport = sessions.get(sessionId)!;
    } else {
      // 创建新会话
      const newSessionId = generateSessionId();
      transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });

      // 创建并连接 MCP Server
      const server = createMcpServer(auth);
      await server.connect(transport);

      // 存储会话
      sessions.set(newSessionId, transport);

      // 设置会话清理（30 分钟后）
      setTimeout(() => {
        sessions.delete(newSessionId);
      }, 30 * 60 * 1000);
    }

    // 使用 Web Standard transport 处理请求
    const response = await transport.handleRequest(request);
    return response;
  } catch (error) {
    console.error("MCP endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp - 关闭 MCP 会话
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get("mcp-session-id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    const transport = sessions.get(sessionId);
    if (transport) {
      await transport.close();
      sessions.delete(sessionId);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("MCP session close error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// OPTIONS - CORS 预检
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id, mcp-protocol-version",
    },
  });
}
