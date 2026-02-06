// src/lib/auth-client.ts
// Client-side auth utilities for OIDC token management
// Uses oidc-client-ts UserManager for token storage and refresh

import { UserManager, User } from "oidc-client-ts";
import { createUserManager, getStoredOidcConfig, storeOidcConfig, clearOidcConfig, type OidcConfig } from "./oidc";

// Singleton UserManager instance
let userManager: UserManager | null = null;

// Get or create UserManager
export function getUserManager(): UserManager | null {
  if (typeof window === "undefined") return null;

  if (!userManager) {
    const config = getStoredOidcConfig();
    if (config) {
      userManager = createUserManager(config);
    }
  }
  return userManager;
}

// Initialize UserManager with config
export function initUserManager(config: OidcConfig): UserManager {
  storeOidcConfig(config);
  userManager = createUserManager(config);
  return userManager;
}

// Clear UserManager (on logout)
export function clearUserManager(): void {
  userManager = null;
}

// Get current user from UserManager
export async function getOidcUser(): Promise<User | null> {
  const manager = getUserManager();
  if (!manager) return null;

  try {
    return await manager.getUser();
  } catch {
    return null;
  }
}

// Get valid access token (will trigger silent renew if needed)
export async function getAccessToken(): Promise<string | null> {
  const user = await getOidcUser();

  if (!user) return null;

  // Check if token is expired
  if (user.expired) {
    // Try silent renew
    const manager = getUserManager();
    if (manager) {
      try {
        const renewedUser = await manager.signinSilent();
        return renewedUser?.access_token || null;
      } catch {
        // Silent renew failed, user needs to re-login
        return null;
      }
    }
    return null;
  }

  return user.access_token;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getOidcUser();
  return user !== null && !user.expired;
}

// Create authenticated fetch wrapper
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// Create fetch hook for SWR or React Query
export function createAuthFetcher() {
  return async (url: string) => {
    const response = await authFetch(url);
    if (!response.ok) {
      const error = new Error("Fetch failed");
      throw error;
    }
    return response.json();
  };
}

// Login redirect
export async function login(): Promise<void> {
  const manager = getUserManager();
  if (manager) {
    await manager.signinRedirect();
  }
}

// Logout
export async function logout(): Promise<void> {
  const manager = getUserManager();
  if (manager) {
    try {
      await manager.signoutRedirect();
    } catch {
      // Signout redirect may fail, clear user anyway
      await manager.removeUser();
    }
  }
  clearUserManager();
  clearOidcConfig();
}
