"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRealtime(projectUuid: string) {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource | null = null;
    let debounceTimer: NodeJS.Timeout;

    function connect() {
      es = new EventSource(`/api/events?projectUuid=${projectUuid}`);

      es.onmessage = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          router.refresh();
        }, 500);
      };

      es.onerror = () => {
        // Browser EventSource auto-reconnects on error
      };
    }

    function disconnect() {
      if (es) {
        es.close();
        es = null;
      }
    }

    // Connect when tab is visible, disconnect when hidden
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        connect();
        // Refresh on tab return to catch missed events
        router.refresh();
      } else {
        disconnect();
      }
    }

    // Initial connect
    connect();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disconnect();
      clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [projectUuid, router]);
}
