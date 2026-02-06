// src/app/api/auth/callback/route.ts
// OIDC Callback API - Registers user in database
// UUID-Based Architecture: All operations use UUIDs
// Note: No longer creates Chorus JWT - frontend uses OIDC access token directly

import { NextRequest } from "next/server";
import { success, errors } from "@/lib/api-response";
import { findOrCreateUserByOidc, getCompanyByUuid } from "@/services/user.service";

// POST /api/auth/callback
// Body: { companyUuid, oidcSub, email, name? }
// Creates or updates user in database after OIDC login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyUuid, oidcSub, email, name } = body;

    // Validate required fields
    if (!companyUuid || !oidcSub || !email) {
      return errors.badRequest("Missing required fields: companyUuid, oidcSub, email");
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

    // Return user info (no JWT - frontend uses OIDC access token directly)
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
    });
  } catch (error) {
    console.error("OIDC callback error:", error);
    return errors.internal("Failed to process OIDC callback");
  }
}
