"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Lightbulb, Bot } from "lucide-react";
import { authFetch } from "@/lib/auth-client";

interface Idea {
  uuid: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeType: string | null;
  assigneeName?: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-[#FFF3E0] text-[#E65100]" },
  assigned: { label: "Assigned", color: "bg-[#E3F2FD] text-[#1976D2]" },
  in_progress: { label: "In Progress", color: "bg-[#E8F5E9] text-[#5A9E6F]" },
  pending_review: { label: "Pending Review", color: "bg-[#F3E5F5] text-[#7B1FA2]" },
  completed: { label: "Completed", color: "bg-[#E0F2F1] text-[#00796B]" },
  closed: { label: "Closed", color: "bg-[#F5F5F5] text-[#9A9A9A]" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-[#9A9A9A]" },
  medium: { label: "Medium", color: "text-[#C67A52]" },
  high: { label: "High", color: "text-[#D32F2F]" },
};

export default function IdeasPage() {
  const t = useTranslations();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: "", description: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const getCurrentProjectUuid = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentProjectUuid");
    }
    return null;
  };

  const fetchIdeas = async () => {
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid) {
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch(`/api/projects/${projectUuid}/ideas`);
      const data = await response.json();
      if (data.success) {
        setIdeas(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch ideas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectUuid = getCurrentProjectUuid();
    if (!projectUuid || !newIdea.title.trim()) return;

    setSubmitting(true);
    try {
      const response = await authFetch(`/api/projects/${projectUuid}/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIdea),
      });
      const data = await response.json();
      if (data.success) {
        setIdeas([data.data, ...ideas]);
        setNewIdea({ title: "", description: "", priority: "medium" });
        setShowNewForm(false);
      }
    } catch (error) {
      console.error("Failed to create idea:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIdeas = filter === "all"
    ? ideas
    : ideas.filter((idea) => idea.status === filter);

  const statusCounts = ideas.reduce((acc, idea) => {
    acc[idea.status] = (acc[idea.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#6B6B6B]">{t("ideas.loadingIdeas")}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("ideas.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("ideas.subtitle")}
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("ideas.newIdea")}
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          {t("ideas.all")} ({ideas.length})
        </Button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0 && status !== "open") return null;
          return (
            <Button
              key={status}
              variant={filter === status ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* New Idea Form */}
      {showNewForm && (
        <Card className="mb-6 border-primary p-5">
          <form onSubmit={handleCreateIdea} className="space-y-4">
            <div>
              <Input
                type="text"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                placeholder={t("ideas.whatIsYourIdea")}
                className="border-0 bg-transparent text-lg font-medium focus-visible:ring-0"
                autoFocus
              />
            </div>
            <div>
              <Textarea
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                placeholder={t("ideas.addMoreDetails")}
                rows={3}
                className="resize-none border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {["low", "medium", "high"].map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={newIdea.priority === p ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setNewIdea({ ...newIdea, priority: p })}
                    className="rounded-full"
                  >
                    {t(`priority.${p}`)}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewForm(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newIdea.title.trim() || submitting}
                >
                  {submitting ? t("common.creating") : t("common.create")}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {filter === "all" ? t("ideas.noIdeas") : `No ${statusConfig[filter]?.label.toLowerCase()} ideas`}
          </h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {filter === "all"
              ? t("ideas.startByAdding")
              : t("ideas.ideasWithStatus")}
          </p>
          {filter === "all" && (
            <Button onClick={() => setShowNewForm(true)}>
              {t("ideas.addFirstIdea")}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <Link key={idea.uuid} href={`/ideas/${idea.uuid}`}>
              <Card className="group cursor-pointer p-4 transition-all hover:border-primary hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-medium text-foreground group-hover:text-primary">
                        {idea.title}
                      </h3>
                      <Badge className={statusConfig[idea.status]?.color || ""}>
                        {statusConfig[idea.status]?.label || idea.status}
                      </Badge>
                      {idea.priority !== "medium" && (
                        <span className={`text-xs font-medium ${priorityConfig[idea.priority]?.color}`}>
                          {priorityConfig[idea.priority]?.label}
                        </span>
                      )}
                    </div>
                    {idea.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {idea.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </span>
                      {idea.assigneeName && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {idea.assigneeName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {idea.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Open claim modal
                      }}
                    >
                      {t("common.claim")}
                    </Button>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
