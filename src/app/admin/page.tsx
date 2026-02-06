"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalCompanies: number;
  totalUsers: number;
  totalAgents: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/companies?pageSize=1");
      const data = await response.json();

      if (data.success) {
        setStats({
          totalCompanies: data.meta?.total || 0,
          totalUsers: 0,
          totalAgents: 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FAF8F4] px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#171717]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#737373]">
          Welcome to Chorus Super Admin
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[#737373]">Total Companies</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-[#737373]"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-[#171717]">
            {loading ? "..." : stats?.totalCompanies || 0}
          </div>
          <p className="mt-1 text-xs text-[#737373]">Registered organizations</p>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[#737373]">Total Users</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-[#737373]"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-[#171717]">
            {loading ? "..." : stats?.totalUsers || 0}
          </div>
          <p className="mt-1 text-xs text-[#737373]">
            Human users across all companies
          </p>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[#737373]">Total Agents</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-[#737373]"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div className="text-3xl font-semibold text-[#171717]">
            {loading ? "..." : stats?.totalAgents || 0}
          </div>
          <p className="mt-1 text-xs text-[#737373]">
            AI agents across all companies
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-[#171717]">Quick Actions</h2>
          <p className="text-sm text-[#737373]">Common administrative tasks</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/companies/new"
            className="flex items-center gap-4 rounded-lg border border-[#E5E2DC] p-4 transition-colors hover:bg-[#F5F5F5]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#171717]"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-[#171717]">Add Company</div>
              <div className="text-sm text-[#737373]">
                Register a new organization
              </div>
            </div>
          </Link>

          <Link
            href="/admin/companies"
            className="flex items-center gap-4 rounded-lg border border-[#E5E2DC] p-4 transition-colors hover:bg-[#F5F5F5]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-[#171717]"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-[#171717]">Manage Companies</div>
              <div className="text-sm text-[#737373]">
                View and configure organizations
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
