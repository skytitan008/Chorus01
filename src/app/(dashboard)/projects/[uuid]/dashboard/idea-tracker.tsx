"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IdeaTrackerList } from "./idea-tracker-list";
import { IdeaTrackerStats } from "./idea-tracker-stats";
import { NewIdeaDialog } from "./new-idea-dialog";

interface IdeaTrackerProps {
  projectUuid: string;
  currentUserUuid: string;
}

export function IdeaTracker({ projectUuid, currentUserUuid }: IdeaTrackerProps) {
  const t = useTranslations("ideaTracker");
  const [activeTab, setActiveTab] = useState<"ideas" | "stats">("ideas");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);

  // Suppress unused variable warning — currentUserUuid will be used when detail panel is added
  void currentUserUuid;

  const handleIdeaCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header: Tabs + New Idea button */}
      {!isEmpty && (
        <div className="mb-4 flex items-center justify-between">
          {/* Tab switcher */}
          <div className="flex gap-0.5 rounded-lg border border-[#E5E0D8] bg-[#F7F6F3] p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("ideas")}
              className={`rounded-md px-3 py-1 h-auto text-[12px] font-medium transition-colors ${
                activeTab === "ideas"
                  ? "bg-white text-[#2C2C2C] shadow-sm"
                  : "text-[#9A9A9A] hover:text-[#6B6B6B]"
              }`}
            >
              {t("tabs.ideas")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("stats")}
              className={`rounded-md px-3 py-1 h-auto text-[12px] font-medium transition-colors ${
                activeTab === "stats"
                  ? "bg-white text-[#2C2C2C] shadow-sm"
                  : "text-[#9A9A9A] hover:text-[#6B6B6B]"
              }`}
            >
              {t("tabs.stats")}
            </Button>
          </div>

          {/* New Idea button — only on ideas tab */}
          {activeTab === "ideas" && (
            <Button
              onClick={() => setShowNewIdeaDialog(true)}
              size="sm"
              className="gap-1.5 rounded-md bg-[#C67A52] px-3.5 py-2 text-white hover:bg-[#B56A42]"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newIdea")}
            </Button>
          )}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "ideas" ? (
        <IdeaTrackerList
          key={refreshKey}
          projectUuid={projectUuid}
          onNewIdea={() => setShowNewIdeaDialog(true)}
          onEmptyChange={setIsEmpty}
        />
      ) : (
        <IdeaTrackerStats projectUuid={projectUuid} />
      )}

      {/* New Idea Dialog */}
      <NewIdeaDialog
        open={showNewIdeaDialog}
        onOpenChange={setShowNewIdeaDialog}
        projectUuid={projectUuid}
        onCreated={handleIdeaCreated}
      />
    </div>
  );
}
