// src/types/auth.ts
// 认证相关类型定义 (ARCHITECTURE.md §6)
// UUID-Based Architecture: All IDs are UUIDs

export type ActorType = "user" | "agent" | "super_admin";
export type AgentRole = "pm" | "developer" | "pm_agent" | "developer_agent";

// 当前请求的认证上下文 (UUID-based)
export interface AuthContext {
  type: ActorType;
  companyUuid: string;  // Company UUID
  actorUuid: string;    // User UUID or Agent UUID
  roles?: AgentRole[];  // Agent 角色列表
  ownerUuid?: string;   // Agent's Owner User UUID
}

// User 认证上下文
export interface UserAuthContext extends AuthContext {
  type: "user";
  email?: string;
  name?: string;
}

// Agent 认证上下文
export interface AgentAuthContext extends AuthContext {
  type: "agent";
  roles: AgentRole[];
  ownerUuid?: string;
  agentName: string;
}

// Super Admin 认证上下文
export interface SuperAdminAuthContext {
  type: "super_admin";
  email: string;
}

// API Key 验证结果 (UUID-based)
export interface ApiKeyValidationResult {
  valid: boolean;
  agent?: {
    uuid: string;
    companyUuid: string;
    name: string;
    roles: string[];
    ownerUuid: string | null;
  };
  apiKey?: {
    uuid: string;
  };
  error?: string;
}
