"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Manages browser URL for side-panel navigation using History API.
 *
 * - openPanel(id): pushState on first open, replaceState when switching items
 * - closePanel(): pushState back to base URL
 * - popstate: syncs React state from pathname
 * - Preserves query params (filters, etc.)
 */
export function usePanelUrl(basePath: string, initialSelectedId?: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const isPanelOpenRef = useRef(!!initialSelectedId);

  const openPanel = useCallback(
    (id: string) => {
      const search = window.location.search;
      const newUrl = `${basePath}/${id}${search}`;

      if (isPanelOpenRef.current) {
        // Switching between items — replaceState to avoid history bloat
        window.history.replaceState(null, "", newUrl);
      } else {
        // First open — pushState so back button closes panel
        window.history.pushState(null, "", newUrl);
      }

      isPanelOpenRef.current = true;
      setSelectedId(id);
    },
    [basePath]
  );

  const closePanel = useCallback(() => {
    const search = window.location.search;
    window.history.pushState(null, "", `${basePath}${search}`);
    isPanelOpenRef.current = false;
    setSelectedId(null);
  }, [basePath]);

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    function handlePopState() {
      const pathname = window.location.pathname;
      // Check if pathname matches basePath/{id}
      if (pathname.startsWith(basePath + "/")) {
        const id = pathname.slice(basePath.length + 1);
        if (id && !id.includes("/")) {
          isPanelOpenRef.current = true;
          setSelectedId(id);
          return;
        }
      }
      // No ID in URL — panel closed
      isPanelOpenRef.current = false;
      setSelectedId(null);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [basePath]);

  return { selectedId, openPanel, closePanel };
}
