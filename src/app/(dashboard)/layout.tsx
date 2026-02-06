"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Music,
  ArrowLeft,
  ChevronDown,
  Plus,
  LayoutDashboard,
  Lightbulb,
  FileText,
  Tags,
  CheckSquare,
  Activity,
  FolderKanban,
  Settings,
  LogOut,
} from "lucide-react";
import { getAccessToken, authFetch, logout as authLogout, clearUserManager } from "@/lib/auth-client";

interface User {
  uuid: string;
  email: string;
  name: string;
}

interface Project {
  uuid: string;
  name: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  // Determine if we're in a project context
  // Global pages: /projects, /projects/new, /settings
  // Project pages: /projects/[uuid], /dashboard, /ideas, /tasks, etc.
  const isGlobalPage =
    pathname === "/projects" ||
    pathname === "/projects/new" ||
    pathname === "/settings";
  const isProjectContext = currentProject && !isGlobalPage;

  useEffect(() => {
    checkSession();
    fetchProjects();
  }, []);

  // Watch for pathname changes to update currentProject when entering /projects/[uuid]
  useEffect(() => {
    if (projects.length === 0) return;

    // Check if we're on a project detail page /projects/[uuid]
    const projectDetailMatch = pathname.match(/^\/projects\/([^/]+)$/);
    if (projectDetailMatch) {
      const projectUuid = projectDetailMatch[1];
      // Don't match "new"
      if (projectUuid !== "new") {
        const project = projects.find((p) => p.uuid === projectUuid);
        if (project && currentProject?.uuid !== projectUuid) {
          setCurrentProject(project);
          localStorage.setItem("currentProjectUuid", projectUuid);
        }
      }
    }
  }, [pathname, projects, currentProject?.uuid]);

  const checkSession = async () => {
    const token = await getAccessToken();

    if (!token) {
      // No token, redirect to login
      router.push("/login");
      return;
    }

    try {
      // Verify token and get user info from API
      const response = await authFetch("/api/auth/session");

      if (!response.ok) {
        // Token invalid, clear and redirect to login
        clearUserManager();
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (data.success && data.data.user) {
        setUser({
          uuid: data.data.user.uuid,
          email: data.data.user.email,
          name: data.data.user.name || data.data.user.email,
        });
      } else {
        // Invalid response, redirect to login
        clearUserManager();
        router.push("/login");
        return;
      }
    } catch (error) {
      console.error("Session check failed:", error);
      clearUserManager();
      router.push("/login");
      return;
    }

    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      // Use authFetch to include Bearer token for proper company filtering
      const response = await authFetch("/api/projects");
      if (!response.ok) {
        console.error("Failed to fetch projects:", response.status);
        return;
      }
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setProjects(data.data);
        // Set first project as current if none selected
        const savedProjectUuid = localStorage.getItem("currentProjectUuid");
        const savedProject = data.data.find(
          (p: Project) => p.uuid === savedProjectUuid
        );
        setCurrentProject(savedProject || data.data[0]);
        if (!savedProject && data.data[0]) {
          localStorage.setItem("currentProjectUuid", data.data[0].uuid);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem("currentProjectUuid", project.uuid);
    setProjectMenuOpen(false);
    // Navigate to project dashboard after selection
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch {
      clearUserManager();
    }
    localStorage.removeItem("currentProjectUuid");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  // Project navigation items (shown when inside a project)
  const projectNavItems = [
    { href: "/dashboard", label: t("nav.overview"), icon: LayoutDashboard },
    { href: "/ideas", label: t("nav.ideas"), icon: Lightbulb },
    { href: "/documents", label: t("nav.documents"), icon: FileText },
    { href: "/proposals", label: t("nav.proposals"), icon: Tags },
    { href: "/tasks", label: t("nav.tasks"), icon: CheckSquare },
    { href: "/activity", label: t("nav.activity"), icon: Activity },
  ];

  // Global navigation items (shown when NOT in a project)
  const globalNavItems = [
    { href: "/projects", label: t("nav.projects"), icon: FolderKanban },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const isNavActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/projects") {
      return pathname === "/projects" || pathname.startsWith("/projects/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-[220px] flex-shrink-0 flex-col justify-between border-r border-border bg-card">
        <div className="flex flex-col gap-8 p-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Music className="h-7 w-7 text-foreground" />
            <span className="text-base font-semibold text-foreground">
              Chorus
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {isProjectContext ? (
              <>
                {/* Back to Projects (shown in project context) */}
                <Link href="/projects">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t("nav.backToProjects")}
                  </Button>
                </Link>

                {/* Current Project Selector */}
                {currentProject && (
                  <div className="relative mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                      className="w-full justify-between px-3 py-1.5"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        {currentProject.name}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-muted-foreground transition-transform ${projectMenuOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                    {projectMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card py-1 shadow-lg">
                        {projects.map((project) => (
                          <Button
                            key={project.uuid}
                            variant="ghost"
                            size="sm"
                            onClick={() => selectProject(project)}
                            className={`w-full justify-start px-3 py-2 text-[13px] ${
                              currentProject?.uuid === project.uuid
                                ? "bg-secondary font-medium text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {project.name}
                          </Button>
                        ))}
                        <div className="my-1 border-t border-border" />
                        <Link
                          href="/projects/new"
                          onClick={() => setProjectMenuOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 px-3 py-2 text-[13px] text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            {t("nav.newProject")}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Project Navigation Items */}
                <div className="mt-2 flex flex-col gap-1">
                  {projectNavItems.map((item) => {
                    const isActive = isNavActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`w-full justify-start gap-2.5 text-[13px] ${
                            isActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Global Navigation Items (Projects, Settings) */}
                <div className="flex flex-col gap-1">
                  {globalNavItems.map((item) => {
                    const isActive = isNavActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={`w-full justify-start gap-2.5 text-[13px] ${
                            isActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-foreground">
                {user?.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
