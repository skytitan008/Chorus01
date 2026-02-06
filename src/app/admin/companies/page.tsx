"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CompanyListItem } from "@/types/admin";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/admin/companies?pageSize=50");
      const data = await response.json();

      if (data.success) {
        setCompanies(data.data);
        setTotal(data.meta?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uuid: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/companies/${uuid}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCompanies();
      } else {
        const data = await response.json();
        alert(data.error?.message || "Failed to delete company");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-full bg-[#FAF8F4] px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717]">Companies</h1>
          <p className="mt-1 text-sm text-[#737373]">
            {total} registered organization{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/companies/new">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2C2C2C]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Company
          </button>
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E2DC] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E2DC]">
              <th className="px-4 py-3 text-left text-sm font-medium text-[#737373]">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#737373]">
                Email Domains
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#737373]">
                OIDC Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[#737373]">
                Users
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[#737373]">
                Agents
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[#737373]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#737373]">
                  Loading...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#737373]">
                  No companies found.{" "}
                  <Link
                    href="/admin/companies/new"
                    className="text-[#171717] underline hover:no-underline"
                  >
                    Add your first company
                  </Link>
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.uuid}
                  className="border-b border-[#E5E2DC] last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-[#171717]">
                    {company.name}
                  </td>
                  <td className="px-4 py-3">
                    {company.emailDomains.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {company.emailDomains.map((domain) => (
                          <span
                            key={domain}
                            className="rounded-md bg-[#F5F5F5] px-2 py-0.5 text-xs text-[#737373]"
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#A3A3A3]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {company.oidcEnabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Not configured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#737373]">
                    {company.userCount}
                  </td>
                  <td className="px-4 py-3 text-right text-[#737373]">
                    {company.agentCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/companies/${company.uuid}`}>
                        <button className="rounded-lg p-2 text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      </Link>
                      <button
                        className="rounded-lg p-2 text-[#DC2626] hover:bg-red-50"
                        onClick={() => handleDelete(company.uuid, company.name)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
