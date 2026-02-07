"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";
import type { DocumentDraft, TaskDraft } from "@/services/proposal.service";

interface Proposal {
  uuid: string;
  title: string;
  description: string | null;
  inputType: string;
  documentDrafts: DocumentDraft[] | null;
  taskDrafts: TaskDraft[] | null;
  status: string;
  createdBy: { type: string; uuid: string; name: string } | null;
  createdByType: string;
  review: {
    reviewedBy: { type: string; uuid: string; name: string };
    reviewNote: string | null;
    reviewedAt: string | null;
  } | null;
  createdAt: string;
}

interface ProposalKanbanProps {
  projectUuid: string;
  proposals: Proposal[];
}

// Column config — matches task kanban pattern
const columnConfigs = [
  { id: "draft", labelKey: "status.draft", statuses: ["draft"] },
  { id: "pending", labelKey: "status.pendingReview", statuses: ["pending"] },
  {
    id: "completed",
    labelKey: "proposals.completed",
    statuses: ["approved", "closed"],
  },
];

// Status badge colors — same palette as task kanban
const statusColors: Record<string, string> = {
  draft: "bg-[#F5F5F5] text-[#6B6B6B]",
  pending: "bg-[#FFF3E0] text-[#E65100]",
  approved: "bg-[#E8F5E9] text-[#2E7D32]",
  closed: "bg-[#F5F5F5] text-[#9A9A9A]",
};

const statusI18nKeys: Record<string, string> = {
  draft: "draft",
  pending: "pendingReview",
  approved: "approved",
  closed: "closed",
};

function getTypeTagKey(proposal: Proposal): string | null {
  const docCount = proposal.documentDrafts?.length || 0;
  const taskCount = proposal.taskDrafts?.length || 0;

  if (docCount > 0 && taskCount > 0) return "proposals.typeDocumentAndTasks";
  if (docCount > 0)
    return docCount === 1
      ? "proposals.typeNewDocument"
      : "proposals.typeDocumentUpdate";
  if (taskCount > 0) return "proposals.typeTaskBreakdown";
  return null;
}

export function ProposalKanban({ projectUuid, proposals }: ProposalKanbanProps) {
  const t = useTranslations();

  const getProposalsForColumn = (statuses: string[]) =>
    proposals.filter((p) => statuses.includes(p.status));

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
      {columnConfigs.map((column) => {
        const columnProposals = getProposalsForColumn(column.statuses);

        return (
          <div
            key={column.id}
            className="flex w-[300px] flex-shrink-0 flex-col rounded-xl bg-[#F5F2EC] p-4"
          >
            {/* Column Header — same as task kanban */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[#2C2C2C]">
                  {t(column.labelKey)}
                </h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#6B6B6B]">
                  {columnProposals.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              {columnProposals.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E0D8] text-sm text-[#9A9A9A]">
                  {t("proposals.noProposals")}
                </div>
              ) : (
                columnProposals.map((proposal) => {
                  const typeTagKey = getTypeTagKey(proposal);

                  return (
                    <Link
                      key={proposal.uuid}
                      href={`/projects/${projectUuid}/proposals/${proposal.uuid}`}
                      className="block"
                    >
                      <Card className="cursor-pointer border-[#E5E0D8] bg-white p-4 transition-all hover:border-[#C67A52] hover:shadow-sm">
                        {/* Row 1: Status badge + Type tag */}
                        <div className="mb-2 flex items-start justify-between">
                          <Badge
                            className={
                              statusColors[proposal.status] || statusColors.draft
                            }
                          >
                            {t(
                              `status.${statusI18nKeys[proposal.status] || proposal.status}`
                            )}
                          </Badge>
                          {typeTagKey && (
                            <span className="rounded bg-[#FFF3E0] px-2 py-0.5 text-xs font-medium text-[#E65100]">
                              {t(typeTagKey)}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="mb-1 font-medium text-[#2C2C2C]">
                          {proposal.title}
                        </h4>

                        {/* Description */}
                        {proposal.description && (
                          <p className="mb-2 line-clamp-2 text-sm text-[#6B6B6B]">
                            {proposal.description}
                          </p>
                        )}

                        {/* Bottom row: Creator */}
                        <div className="flex items-center justify-between text-xs text-[#9A9A9A]">
                          {proposal.createdBy && (
                            <span className="flex items-center gap-1">
                              {proposal.createdByType === "agent" ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              {proposal.createdBy.name}
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
