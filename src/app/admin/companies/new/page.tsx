"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    emailDomain: "",
    oidcIssuer: "",
    oidcClientId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          emailDomains: [formData.emailDomain.trim()],
          oidcIssuer: formData.oidcIssuer.trim(),
          oidcClientId: formData.oidcClientId.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to create company");
        return;
      }

      router.push(`/admin/companies/${data.data.uuid}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FAF8F4]">
      <div className="px-8 py-6">
        {/* Top Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-[#737373]">
            Super Admin / Companies / New
          </div>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-[#737373]"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
            <span className="text-sm text-[#737373]">admin@chorus.dev</span>
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#171717]">
            Create Company
          </h1>
          <p className="mt-1 text-sm text-[#737373]">
            Set up a new company and configure OIDC authentication
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Basic Information Card */}
          <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-[#171717]"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
              <span className="text-sm font-medium text-[#171717]">
                Basic Information
              </span>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#171717]">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Acme Corporation"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-3 text-sm placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#171717]">
                  Email Domain
                </label>
                <input
                  type="text"
                  value={formData.emailDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, emailDomain: e.target.value })
                  }
                  placeholder="e.g., acme.com"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-3 text-sm placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-50"
                />
                <p className="text-xs text-[#737373]">
                  Users with this email domain will be routed to this company
                </p>
              </div>
            </div>
          </div>

          {/* OIDC Configuration Card */}
          <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[#171717]"
                >
                  <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                  <path d="m21 2-9.6 9.6" />
                  <circle cx="7.5" cy="15.5" r="5.5" />
                </svg>
                <span className="text-sm font-medium text-[#171717]">
                  OIDC Configuration
                </span>
              </div>
              <span className="text-[11px] text-[#DC2626]">Required</span>
            </div>

            <p className="mb-5 text-xs text-[#737373]">
              Configure OpenID Connect (PKCE) for single sign-on authentication
            </p>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#171717]">
                  OIDC Issuer URL
                </label>
                <input
                  type="url"
                  value={formData.oidcIssuer}
                  onChange={(e) =>
                    setFormData({ ...formData, oidcIssuer: e.target.value })
                  }
                  placeholder="https://login.microsoftonline.com/tenant-id/v2.0"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-3 text-sm placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-50"
                />
                <p className="text-xs text-[#737373]">
                  The OpenID Connect discovery endpoint URL
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#171717]">
                  Client ID
                </label>
                <input
                  type="text"
                  value={formData.oidcClientId}
                  onChange={(e) =>
                    setFormData({ ...formData, oidcClientId: e.target.value })
                  }
                  placeholder="e.g., 12345678-abcd-efgh-ijkl-123456789012"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-3 text-sm placeholder:text-[#A3A3A3] focus:border-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717] disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 py-2">
            <Link href="/admin/companies">
              <button
                type="button"
                disabled={loading}
                className="rounded-lg border border-[#E5E2DC] px-5 py-2.5 text-[13px] font-medium text-[#171717] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.emailDomain || !formData.oidcIssuer || !formData.oidcClientId}
              className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#2C2C2C] disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {loading ? "Creating..." : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
