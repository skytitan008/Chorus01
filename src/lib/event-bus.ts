// src/lib/event-bus.ts
// 内存事件总线 — 进程级单例
// 将来多实例部署时替换为 Redis pub/sub，SSE 端点和客户端代码不变

import { EventEmitter } from "events";

export interface RealtimeEvent {
  companyUuid: string;
  projectUuid: string;
  entityType: "task" | "idea" | "proposal" | "document";
  entityUuid: string;
  action: "created" | "updated" | "deleted";
}

class ChorusEventBus extends EventEmitter {
  emitChange(event: RealtimeEvent) {
    this.emit("change", event);
  }
}

export const eventBus = new ChorusEventBus();
