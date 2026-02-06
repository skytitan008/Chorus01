// src/app/api/auth/refresh/route.ts
// Token refresh API - Refresh user session tokens
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest, NextResponse } from "next/server";
import { success, errors } from "@/lib/api-response";
import {
  verifyRefreshToken,
  getRefreshTokenFromRequest,
  createUserAccessToken,
  createUserRefreshToken,
  setUserSessionCookies,
  type UserSessionPayload,
} from "@/lib/user-session";
import { getUserByUuid } from "@/services/user.service";

// POST /api/auth/refresh
// Body: { oidcAccessToken?, oidcRefreshToken?, oidcExpiresAt? }
// Refreshes the session tokens, optionally with new OIDC tokens
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      return errors.unauthorized("No refresh token");
    }

    // Verify refresh token
    const tokenPayload = await verifyRefreshToken(refreshToken);
    if (!tokenPayload) {
      return errors.unauthorized("Invalid refresh token");
    }

    // Get user from database (UUID-based)
    const user = await getUserByUuid(tokenPayload.userUuid);
    if (!user) {
      return errors.unauthorized("User not found");
    }

    // Get new OIDC tokens from request body (if provided)
    let oidcAccessToken: string | undefined;
    let oidcRefreshToken: string | undefined;
    let oidcExpiresAt: number | undefined;

    try {
      const body = await request.json();
      oidcAccessToken = body.oidcAccessToken;
      oidcRefreshToken = body.oidcRefreshToken;
      oidcExpiresAt = body.oidcExpiresAt;
    } catch {
      // Empty body is okay - just refresh the session tokens
    }

    // Create new session payload (UUID-based)
    const sessionPayload: UserSessionPayload = {
      type: "user",
      userUuid: user.uuid,
      companyUuid: user.companyUuid,
      email: user.email || "", // Email should always exist, fallback to empty
      name: user.name || undefined,
      oidcSub: user.oidcSub || "",
      oidcAccessToken,
      oidcRefreshToken,
      oidcExpiresAt,
    };

    // Create new tokens
    const [newAccessToken, newRefreshToken] = await Promise.all([
      createUserAccessToken(sessionPayload),
      createUserRefreshToken(sessionPayload),
    ]);

    // Build response with cookies and token
    const response = NextResponse.json(
      success({
        user: {
          uuid: user.uuid,
          email: user.email,
          name: user.name,
        },
        company: {
          uuid: user.company.uuid,
          name: user.company.name,
        },
        // Return new access token for Bearer auth
        accessToken: newAccessToken,
        refreshed: true,
      })
    );

    // Set new session cookies
    setUserSessionCookies(response, newAccessToken, newRefreshToken);

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return errors.internal("Failed to refresh token");
  }
}
