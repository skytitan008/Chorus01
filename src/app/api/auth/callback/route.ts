// src/app/api/auth/callback/route.ts
// OIDC Callback API - Registers user and creates our own JWT session
// UUID-Based Architecture: All operations use UUIDs

import { NextRequest } from "next/server";
import { success, errors } from "@/lib/api-response";
import { findOrCreateUserByOidc, getCompanyByUuid } from "@/services/user.service";
import {
  createUserAccessToken,
  type UserSessionPayload,
} from "@/lib/user-session";

// POST /api/auth/callback
// Body: { companyUuid, oidcSub, email, name?, accessToken, refreshToken?, expiresAt? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyUuid, oidcSub, email, name, accessToken, refreshToken, expiresAt } = body;

    // Validate required fields
    if (!companyUuid || !oidcSub || !email || !accessToken) {
      return errors.badRequest("Missing required fields: companyUuid, oidcSub, email, accessToken");
    }

    // Get company
    const company = await getCompanyByUuid(companyUuid);
    if (!company) {
      return errors.notFound("Company not found");
    }

    if (!company.oidcEnabled) {
      return errors.badRequest("OIDC is not enabled for this company");
    }

    // Find or create user in database (UUID-based)
    const user = await findOrCreateUserByOidc({
      oidcSub,
      email,
      name,
      companyUuid: company.uuid,
    });

    // Create our own JWT session token (UUID-based)
    const sessionPayload: UserSessionPayload = {
      type: "user",
      userUuid: user.uuid,
      companyUuid: company.uuid,
      email: user.email || email,
      name: user.name || undefined,
      oidcSub: user.oidcSub || oidcSub,
      oidcAccessToken: accessToken,
      oidcRefreshToken: refreshToken,
      oidcExpiresAt: expiresAt,
    };

    // Create our JWT access token
    const jwtAccessToken = await createUserAccessToken(sessionPayload);

    // Return user info and our JWT token
    return success({
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
      },
      company: {
        uuid: company.uuid,
        name: company.name,
      },
      // Return our JWT for Bearer auth (not the raw OIDC token)
      accessToken: jwtAccessToken,
    });
  } catch (error) {
    console.error("OIDC callback error:", error);
    return errors.internal("Failed to process OIDC callback");
  }
}
