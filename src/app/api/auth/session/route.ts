// src/app/api/auth/session/route.ts
// User session API - Get current session and logout
// UUID-Based Architecture: All operations use UUIDs
// Supports both OIDC tokens (normal users) and session cookies (superadmin)

import { NextRequest, NextResponse } from "next/server";
import { success, errors } from "@/lib/api-response";
import { getAuthContext, isUser } from "@/lib/auth";
import { clearUserSessionCookies } from "@/lib/user-session";
import { getUserByUuid } from "@/services/user.service";

// GET /api/auth/session - Get current user session
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  if (!auth || !isUser(auth)) {
    return errors.unauthorized("No active session");
  }

  // Get fresh user data from database (UUID-based)
  const user = await getUserByUuid(auth.actorUuid);
  if (!user) {
    const response = NextResponse.json(
      { success: false, error: { message: "User not found" } },
      { status: 401 }
    );
    clearUserSessionCookies(response);
    return response;
  }

  return success({
    user: {
      uuid: user.uuid,
      email: user.email,
      name: user.name,
    },
    company: {
      uuid: user.company.uuid,
      name: user.company.name,
    },
  });
}

// DELETE /api/auth/session - Logout (clears superadmin cookies if present)
export async function DELETE() {
  const response = NextResponse.json(success({ message: "Logged out" }));
  clearUserSessionCookies(response);
  return response;
}
