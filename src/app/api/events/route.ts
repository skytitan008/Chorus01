// src/app/api/events/route.ts
// SSE 端点 — 推送实时变更事件到浏览器
// Auth 通过 cookie 认证（EventSource 自动发送 cookie）

import { getAuthContext } from "@/lib/auth";
import { eventBus, type RealtimeEvent } from "@/lib/event-bus";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const projectUuid = request.nextUrl.searchParams.get("projectUuid");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream closed
        }
      };

      // Send initial connection confirmation
      send(": connected\n\n");

      // Subscribe to change events
      const handler = (event: RealtimeEvent) => {
        // Filter by company (multi-tenancy)
        if (event.companyUuid !== auth.companyUuid) return;
        // Optionally filter by project
        if (projectUuid && event.projectUuid !== projectUuid) return;

        send(`data: ${JSON.stringify(event)}\n\n`);
      };

      eventBus.on("change", handler);

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 30_000);

      // Cleanup on abort (client disconnect)
      request.signal.addEventListener("abort", () => {
        eventBus.off("change", handler);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
