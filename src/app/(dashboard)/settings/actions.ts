"use server";

import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth-server";
import {
  listApiKeys,
  createAgent,
  createApiKey,
  deleteAgent,
  getApiKey,
} from "@/services/agent.service";

interface ApiKeyResponse {
  uuid: string;
  keyPrefix: string;
  name: string | null;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
  roles: string[];
}

export async function getApiKeysAction(): Promise<{
  success: boolean;
  data?: ApiKeyResponse[];
  error?: string;
}> {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  try {
    const { apiKeys } = await listApiKeys(auth.companyUuid, 0, 100, auth.actorUuid);

    const data = apiKeys.map((key) => ({
      uuid: key.uuid,
      keyPrefix: key.keyPrefix,
      name: key.name,
      lastUsed: null,
      expiresAt: key.expiresAt?.toISOString() || null,
      createdAt: key.createdAt.toISOString(),
      roles: key.agent?.roles || [],
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return { success: false, error: "Failed to fetch API keys" };
  }
}

interface CreateAgentKeyInput {
  name: string;
  roles: string[];
  persona: string | null;
}

export async function createAgentAndKeyAction(input: CreateAgentKeyInput): Promise<{
  success: boolean;
  key?: string;
  error?: string;
}> {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  try {
    // Create agent with specified roles and persona
    const agent = await createAgent({
      companyUuid: auth.companyUuid,
      name: input.name,
      roles: input.roles,
      ownerUuid: auth.actorUuid,
      persona: input.persona,
    });

    // Create API key for the agent
    const apiKey = await createApiKey({
      companyUuid: auth.companyUuid,
      agentUuid: agent.uuid,
      name: input.name,
    });

    return { success: true, key: apiKey.key };
  } catch (error) {
    console.error("Failed to create agent and API key:", error);
    return { success: false, error: "Failed to create API key" };
  }
}

export async function deleteApiKeyAction(uuid: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/login");
  }

  try {
    // Verify the API key belongs to the current user
    const apiKey = await getApiKey(auth.companyUuid, uuid, auth.actorUuid);
    if (!apiKey) {
      return { success: false, error: "API key not found" };
    }

    await deleteAgent(apiKey.agentUuid);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return { success: false, error: "Failed to delete API key" };
  }
}
