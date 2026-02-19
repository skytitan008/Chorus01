# Chorus vs Plane: Comparative Analysis & Improvement Roadmap

> **Document Version**: 1.0
> **Date**: 2026-02-19
> **Purpose**: Analyze Plane's mature feature set against Chorus, identify gaps, and extract lessons for Chorus's evolution.

---

## 1. Executive Summary

**Plane** is a mature, open-source (AGPL-3.0) project management platform built for human teams, comparable to Jira/Linear. It features a Django + React monorepo architecture with 30+ database models, real-time collaboration, rich integrations, and enterprise-grade deployment support.

**Chorus** is an AI-first collaboration platform implementing AI-DLC methodology. Its core differentiator is treating AI Agents as first-class project participants through 59 MCP tools, session observability, and the "Reversed Conversation" paradigm.

**Key Findings:**
- Chorus's **AI-first architecture** (MCP, sessions, agent roles) has no equivalent in Plane and represents genuine innovation
- Plane's **project management maturity** (20+ features Chorus lacks) provides a clear roadmap for Chorus's evolution
- The highest-impact gaps are: notification system, file management, custom views/filters, and labels/tags

---

## 2. Architecture Comparison

| Dimension | Chorus | Plane |
|-----------|--------|-------|
| **Backend** | Next.js 15 (API Routes) | Django 4.2 (REST Framework) |
| **Frontend** | React 19 + Next.js App Router | React 19 + React Router v7 |
| **Database** | PostgreSQL 16 + Prisma 7 | PostgreSQL 15 + Django ORM |
| **State Management** | React Context | MobX |
| **Real-time** | SSE (in-memory EventBus + `GET /api/events`) | WebSocket (dedicated live server) |
| **Background Jobs** | None | Celery + RabbitMQ |
| **Cache** | None | Redis |
| **File Storage** | None | S3 / MinIO |
| **Search** | Basic SQL queries | Full-text + MongoDB analytics |
| **Monorepo** | Single Next.js app | Turbo monorepo (6 apps, 14 packages) |
| **Models** | 14 Prisma models | 30+ Django models |
| **API Style** | REST + MCP (HTTP Streamable) | REST only |
| **Auth** | OIDC + API Keys + SuperAdmin | OIDC + Email/Password + Magic Links + API Keys |
| **i18n** | next-intl (en, zh) | IntlMessageFormat (en, zh) |
| **Deployment** | Docker Compose + AWS CDK | Docker Compose + K8s + Swarm + CLI + AIO |
| **UI Library** | shadcn/ui (Radix) | shadcn/ui (Radix) |

### Architecture Takeaways

**Plane's separation of concerns** is instructive. By splitting into dedicated services (API, Web, Admin, Live, Worker, Beat, Proxy), Plane achieves:
- Independent scaling of each service
- WebSocket server doesn't block API processing
- Background jobs (email, notifications, analytics) don't impact request latency
- Proxy handles file uploads and SSL termination

Chorus's monolithic Next.js approach is simpler to develop but will hit scaling walls as features grow. Chorus already has a **real-time event system** built on an in-memory EventBus + SSE (`src/lib/event-bus.ts` → `GET /api/events` → `RealtimeProvider` context), which pushes updates to the Kanban board, ideas list, proposals, and session widgets. The EventBus is designed for future Redis pub/sub upgrade when multi-instance deployment is needed. The lack of a background job system and caching layer are the most impactful remaining architectural gaps.

---

## 3. Feature Gap Analysis

### 3.1 Features Plane Has That Chorus Lacks

#### P0 - Critical Gaps (Core PM functionality)

| # | Feature | Plane's Implementation | Impact on Chorus |
|---|---------|----------------------|-----------------|
| 1 | **Notification System** | Full notification model with read/snooze/archive, email delivery, per-user preferences (property_change, state_change, comment, mention) | Agents and humans have no way to receive push updates. This is already identified as P0 in Chorus's own roadmap. |
| 2 | **Labels/Tags** | Many-to-many Label model on Issues, with colors, project-scope, workspace-scope | Tasks/Ideas have no tagging system. Essential for filtering, categorization, and agent-based routing. |
| 3 | **File Attachments** | FileAsset model with S3/MinIO storage, multiple entity types (issue, comment, page, user avatar, etc.), upload size limits | No file attachment capability. Agents cannot share screenshots, logs, or artifacts. |
| 4 | **Custom Workflow States** | Per-project customizable states with state groups (Backlog, Unstarted, Started, Completed, Cancelled), colors, sequences | Chorus has hardcoded status enums. Cannot customize per-project workflows. |
| 5 | **Sub-tasks / Parent-Child** | Issue parent_id field for hierarchical breakdown, unlimited nesting | Tasks are flat. Cannot decompose a task into sub-tasks. The DAG only models "depends on" relationships, not containment. |
| 6 | **Search** | Full-text search across issues, pages, comments | No search functionality. As projects grow, finding specific items becomes difficult. |

#### P1 - Important Gaps (Productivity features)

| # | Feature | Plane's Implementation | Impact on Chorus |
|---|---------|----------------------|-----------------|
| 8 | **Cycles/Sprints** | Named time-boxed iterations with start/end dates, progress tracking, burn-down charts | Chorus has no iteration/sprint concept. Cannot plan fixed-duration work batches. May need an "AI Bolt" concept aligned with AI-DLC. |
| 9 | **Custom Views & Filters** | Saved filter configurations with display preferences (group_by, order_by, layout), access control, locked views | Chorus only has fixed Kanban/DAG views. Cannot create custom filtered views. |
| 10 | **Modules** | Feature/component grouping with lead, members, status, progress tracking | No grouping mechanism beyond Projects. Cannot organize tasks by feature/component. |
| 11 | **Issue Relations** | Semantic linking (blocks, is blocked by, relates to, duplicates) | Only has TaskDependency (blocks/blocked_by). Missing "relates to" and "duplicates" relationships. |
| 12 | **Rich Text Editor** | Prosemirror-based editor package with mentions, embeds, media support | Markdown-only. No rich text editing for documents or comments. |
| 13 | **Intake/Triage** | Inbox system with pending/accepted/rejected/snoozed/duplicate status | No intake pipeline. External requests cannot be triaged before becoming formal Ideas. |
| 14 | **Webhooks** | Event-driven webhook system with logging, retry, per-project subscriptions | No webhook support. External systems cannot react to Chorus events. |
| 15 | **Background Jobs** | Celery + RabbitMQ for email sending, notifications, analytics, scheduled cleanup | No async processing. All operations are synchronous in request lifecycle. |

#### P2 - Nice-to-Have Gaps (Polish features)

| # | Feature | Plane's Implementation | Impact on Chorus |
|---|---------|----------------------|-----------------|
| 16 | **Reactions** | Emoji reactions on issues and comments | No reaction system. Minor but improves engagement. |
| 17 | **Subscribers/Followers** | Subscribe to specific issues for updates | No follow mechanism. Users/agents cannot opt-in to specific item updates. |
| 18 | **Favorites/Bookmarks** | Star/favorite any item for quick access | No bookmarking. Navigation relies on sidebar only. |
| 19 | **Draft Issues** | Save work-in-progress before publishing | No draft state for Tasks/Ideas (Proposals have drafts but Tasks/Ideas don't). |
| 20 | **Estimation Points** | Configurable estimation scales (Fibonacci, linear, custom) | Only storyPoints (integer). No configurable estimation system. |
| 21 | **Import/Export** | Import from GitHub/Jira/Linear, CSV/PDF export | No import/export. Data migration is manual. |
| 22 | **Analytics Dashboard** | Burn-down charts, velocity tracking, workload distribution, custom queries | No analytics. Cannot measure team/agent performance over time. |
| 23 | **Audit Trail Versioning** | Full version history on issues with diff capability | Activity stream exists but no version diffing. |
| 24 | **Bulk Operations** | Bulk update, archive, delete issues | No bulk operations. Each item must be modified individually. |
| 25 | **User Onboarding** | Step-by-step onboarding flow with progress tracking | No onboarding. New users must figure out the platform independently. |
| 26 | **Workspace-level Pages** | Global wiki pages not tied to a project | Documents are project-scoped only. No workspace-level knowledge base. |

### 3.2 Features Chorus Has That Plane Lacks

These are Chorus's core differentiators and should be preserved and strengthened:

| # | Feature | Chorus's Implementation | Why Plane Can't Match This |
|---|---------|------------------------|---------------------------|
| 1 | **AI Agent as First-Class Citizen** | Agents with roles (PM, Developer, Admin), API Keys, polymorphic assignment | Plane treats all users as humans. No concept of agent identity or role-based tool access. |
| 2 | **MCP Integration** | 59 MCP tools via HTTP Streamable Transport, role-based tool registration | No MCP support. Plane's API is designed for human-operated clients only. |
| 3 | **AI-DLC Workflow** | Idea -> Proposal -> Document+Task materialization pipeline | Plane has no proposal/approval workflow. Issues are created directly. |
| 4 | **Reversed Conversation** | AI proposes, human verifies (not human instructs, AI executes) | Plane follows traditional human-driven workflow. |
| 5 | **Session Observability** | AgentSession model, task checkin/checkout, real-time worker badges on Kanban | No concept of agent sessions or real-time worker tracking. |
| 6 | **Multi-Agent Swarm Mode** | Claude Code Plugin with auto-session lifecycle (SubagentStart/Stop hooks) | No multi-agent coordination. |
| 7 | **Zero Context Injection** | Agents auto-receive persona, project context, task context on checkin | No context injection mechanism. |
| 8 | **Proposal Materialization** | Drafts (documents + tasks) materialize into real entities on approval | No equivalent. Issues are created directly without a review gate. |
| 9 | **SSE-based Real-time Event System** | In-memory EventBus → SSE endpoint (`GET /api/events`) → `RealtimeProvider` context with auto-reconnect, visibility-aware disconnect, 500ms debounce. Services (Task, Idea, Proposal, Session) emit events; Kanban, Ideas, Proposals, and PixelCanvas auto-refresh. Designed for future Redis pub/sub upgrade. | Plane uses a separate WebSocket server (`apps/live`), which is more powerful for collaborative editing but requires additional infrastructure. Chorus's SSE approach is simpler and works within the Next.js monolith. |

---

## 4. Detailed Recommendations

### 4.1 Notification & Event System (P0)

**What Plane does:**
- `Notification` model with entity linking, read/snooze/archive states
- `UserNotificationPreference` for per-user control
- `EmailNotificationLog` for delivery tracking
- Celery background task sends emails asynchronously
- Real-time push via WebSocket

**What Chorus should do:**
1. Create a `Notification` model: `{ uuid, recipientType, recipientUuid, entityType, entityUuid, action, title, message, readAt, snoozedUntil, archivedAt }`
2. Add `NotificationPreference` per user/agent: `{ stateChange, commentAdded, taskAssigned, proposalUpdated, ideaClaimed }`
3. Leverage the existing EventBus (`src/lib/event-bus.ts`) — it already emits events from Task, Idea, Proposal, and Session services. Add a notification-specific listener that creates `Notification` records on relevant events.
4. For agents: Deliver notifications via MCP tool (`chorus_get_notifications`) or via the existing SSE stream (with agent auth support added)
5. For humans: Leverage existing SSE infrastructure (`GET /api/events` + `RealtimeProvider`) to push in-app notification badges + optional email

**Chorus-specific enhancement:** Agent notifications should include context summaries (what changed + why it matters for the agent's current task), leveraging Zero Context Injection.

### 4.2 Labels & Tags (P0)

**What Plane does:**
- `Label` model with name, color, parent_id (hierarchical), project_id
- Many-to-many `IssueLabel` junction table
- Labels used in filters, views, analytics

**What Chorus should do:**
1. Create `Label` model: `{ uuid, companyUuid, projectUuid, name, color, parentUuid }`
2. Create `TaskLabel` and `IdeaLabel` junction tables
3. Expose via MCP tools: `chorus_list_labels`, `chorus_add_label_to_task`
4. Add label-based filtering to existing list APIs

### 4.3 File Attachment System (P0)

**What Plane does:**
- `FileAsset` model with entity_type, entity_id, workspace linkage
- S3/MinIO storage backend
- Upload size validation middleware
- Signed URL generation for downloads
- Multiple asset types (attachment, avatar, cover, etc.)

**What Chorus should do:**
1. Add S3-compatible storage (AWS S3 or MinIO for self-hosted)
2. Create `Attachment` model: `{ uuid, companyUuid, targetType, targetUuid, fileName, fileSize, mimeType, s3Key, uploadedBy }`
3. API routes for upload/download with presigned URLs
4. MCP tool: `chorus_upload_attachment`, `chorus_get_attachments`
5. Agents can attach build logs, screenshots, code artifacts

### 4.4 Real-time Updates — Enhance Existing SSE System (P1)

**Current Chorus implementation (already working):**
- **EventBus** (`src/lib/event-bus.ts`): In-memory `EventEmitter` singleton via `globalThis`, emits `RealtimeEvent` with `{ companyUuid, projectUuid, entityType, entityUuid, action }`
- **SSE endpoint** (`GET /api/events`): Authenticated via cookie, filters by `companyUuid` (multi-tenancy) and optional `projectUuid`, 30s heartbeat
- **RealtimeProvider** (`src/contexts/realtime-context.tsx`): Wraps browser `EventSource`, auto-reconnects on tab visibility change, 500ms debounce
- **Consumers**: Kanban board, ideas list, proposal kanban, and pixel canvas widget all use `useRealtimeRefresh()` or `useRealtimeEvent()`
- **Producers**: `task.service.ts` (6 emit points), `idea.service.ts` (5), `proposal.service.ts` (5), `session.service.ts` (3)

**What Plane does differently:**
- Separate WebSocket server for bidirectional real-time collaborative editing
- Supports multiple users editing the same entity simultaneously

**What Chorus should improve:**
1. **Redis pub/sub upgrade**: The EventBus comment already notes this — when deploying multiple Next.js instances, replace the in-memory `EventEmitter` with Redis pub/sub. The SSE endpoint and client code stay unchanged.
2. **Granular event data**: Currently SSE triggers a full `router.refresh()`. Consider sending entity payloads in SSE data so the client can do targeted state updates without a full page refresh.
3. **Document/Activity coverage**: Add `eventBus.emitChange()` calls to `document.service.ts` and `comment.service.ts` (currently missing).
4. **Agent SSE support**: The current SSE endpoint authenticates via cookie (designed for browser `EventSource`). Add Bearer token auth support so agents can also subscribe to real-time events.

### 4.5 Background Job System (P1)

**What Plane does:**
- Celery with RabbitMQ as broker
- Django Celery Beat for scheduled jobs
- Workers for: email, notifications, analytics, imports, cleanups

**What Chorus should do:**
Given the Node.js/Next.js stack:
1. Adopt **BullMQ** (Redis-backed queue for Node.js) as the job processor
2. Job types: notification delivery, email sending, session expiry, analytics aggregation
3. Run the worker as a separate process alongside the Next.js app
4. Add Redis as a required infrastructure dependency

### 4.6 Caching Layer (P1)

**What Plane does:**
- Django Redis cache for frequently accessed data
- Cached querysets, user preferences, workspace settings

**What Chorus should do:**
1. Add Redis as cache backend
2. Cache: project settings, agent personas, label lists, active sessions
3. Invalidate on write through service layer
4. Especially important for MCP endpoints (agents make frequent reads)

### 4.7 Custom Views & Filters (P1)

**What Plane does:**
- `IssueView` model with query (JSON filter), display_filters, display_properties
- Multiple layout types (list, board, calendar, spreadsheet, gantt)
- Access control (private/public), lockable views

**What Chorus should do:**
1. Create `SavedView` model: `{ uuid, projectUuid, name, entityType, filters (JSON), displayConfig (JSON), isPublic, createdBy }`
2. Support filters on: status, priority, assignee, label, date range
3. Support layouts: kanban (existing), list, table, DAG (existing)
4. Expose via API for both UI and MCP access

### 4.8 Sub-tasks / Task Hierarchy (P1)

**What Plane does:**
- `parent_id` on Issue model for unlimited nesting
- Child count aggregation
- Parent context in views

**What Chorus should do:**
1. Add `parentUuid` field to `Task` model
2. This is distinct from `TaskDependency` (which models "blocks/blocked by")
3. A parent task auto-calculates progress from children
4. MCP tools: `chorus_create_subtask`, `chorus_list_subtasks`
5. DAG view should show both dependency and containment relationships

### 4.9 Search (P1)

**What Plane does:**
- Full-text search endpoint
- Search across issues, pages, comments
- MongoDB for analytics queries

**What Chorus should do:**
1. Start with PostgreSQL full-text search (tsvector/tsquery) - no new infrastructure
2. Create search index on: Task.title + Task.description, Idea.title + Idea.description, Document.title + Document.content
3. API endpoint: `GET /api/search?q=keyword&type=task,idea,document`
4. MCP tool: `chorus_search` for agents to find relevant items

### 4.10 Sprints / AI Bolts (P2)

**What Plane does:**
- `Cycle` model with start/end dates, progress snapshots, burn-down data

**What Chorus should consider:**
The AI-DLC methodology uses "Bolts" (hours-to-days) instead of traditional Sprints (weeks). Chorus could implement:
1. `Bolt` model: `{ uuid, projectUuid, name, startDate, endDate, goalDescription }`
2. `BoltTask` junction: assign tasks to a Bolt
3. Progress tracking: completed Agent Hours / total Agent Hours
4. This aligns with AI-DLC's time-compressed iteration model

---

## 5. Learning from Plane's Engineering Practices

### 5.1 Soft Delete Pattern

**Plane**: Uses `deleted_at` timestamp for soft deletes across all models. Data is never permanently lost on user action.

**Chorus**: Uses hard deletes. If an admin deletes a task, it's gone permanently.

**Recommendation**: Add `deletedAt` field to key models (Task, Idea, Document, Proposal). Filter out deleted items by default. Add "Trash" view for recovery.

### 5.2 External Source Tracking

**Plane**: Every major entity has `external_source` and `external_id` fields, enabling seamless import from other tools and bidirectional sync.

**Chorus**: No external source tracking.

**Recommendation**: Add `externalSource` and `externalId` to Task, Idea, and Document models. This prepares for future integrations (GitHub Issues sync, Jira import, etc.).

### 5.3 User Properties per Context

**Plane**: Stores per-user display preferences at each context level (project, cycle, module, view). Each user sees their own filter/sort/layout settings.

**Chorus**: No per-user preferences. All users see the same view.

**Recommendation**: Create `UserViewPreference` model: `{ userUuid, contextType, contextUuid, filters, sortBy, layout }`. Store Kanban column collapse state, DAG zoom level, etc.

### 5.4 Sequence-based Ordering

**Plane**: Uses float-based `sort_order` for manual drag-and-drop reordering across all list entities.

**Chorus**: No manual ordering. Items sorted by creation date or status.

**Recommendation**: Add `sortOrder` (Float) to Task, Idea, and other list entities. Implement fractional indexing for drag-and-drop support.

### 5.5 Comprehensive Audit Trail

**Plane**: `IssueActivity` logs every field change with old/new values. `IssueVersion` stores full snapshots.

**Chorus**: `Activity` model logs actions but doesn't store old/new values.

**Recommendation**: Extend Activity model to include `changes: JSON` field with `{ field, oldValue, newValue }[]`. This enables:
- "What changed" diff views
- Undo capability
- Compliance audit requirements

### 5.6 Rate Limiting & Throttling

**Plane**: DRF throttle classes with configurable rates (30/min anon, 5/min asset upload).

**Chorus**: No rate limiting. MCP endpoints and API routes are unthrottled.

**Recommendation**: Add rate limiting middleware, especially for:
- MCP endpoints (agents can be very chatty)
- API key-based access
- File upload endpoints (future)

### 5.7 Request Logging & APM

**Plane**: Custom middleware for request logging, API token auditing, Sentry error tracking, OpenTelemetry instrumentation.

**Chorus**: No request logging or APM.

**Recommendation**: Add structured request logging middleware. Log: endpoint, method, auth type, response time, status code. Essential for debugging agent behavior and performance optimization.

---

## 6. Prioritized Implementation Roadmap

### Phase 1: Foundation (Fills Critical Gaps)

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|-------------|
| P0-1 | Notification System | High | Existing EventBus, (optional) Redis |
| P0-2 | Labels/Tags | Low | None |
| P0-3 | File Attachments | Medium | S3/MinIO |
| P0-4 | Custom Workflow States | Medium | Schema migration |
| P0-5 | Sub-tasks | Low | Schema migration |
| P0-6 | Search (PostgreSQL FTS) | Medium | None |

### Phase 2: Productivity

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|-------------|
| P1-1 | Background Job System (BullMQ) | High | Redis |
| P1-2 | Caching Layer (Redis) | Medium | Redis |
| P1-3 | SSE Enhancements (Redis pub/sub, granular data, agent auth) | Medium | Redis |
| P1-4 | Custom Views & Filters | Medium | Labels |
| P1-5 | Rich Text Editor | High | None |
| P1-6 | Webhooks | Medium | Existing EventBus |
| P1-7 | Issue Relations (relates to, duplicates) | Low | None |
| P1-8 | Intake/Triage | Medium | None |

### Phase 3: Enterprise & Scale

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|-------------|
| P2-1 | AI Bolts (Sprint equivalent) | Medium | None |
| P2-2 | Analytics Dashboard | High | Background Jobs |
| P2-3 | Import/Export | High | External Source Tracking |
| P2-4 | Bulk Operations | Medium | None |
| P2-5 | Soft Deletes | Medium | Schema migration |
| P2-6 | Rate Limiting | Low | None |
| P2-7 | Request Logging & APM | Medium | None |

### Phase 4: Polish

| Priority | Feature | Effort | Dependencies |
|----------|---------|--------|-------------|
| P3-1 | Reactions | Low | None |
| P3-2 | Subscribers/Followers | Low | Notification System |
| P3-3 | Favorites/Bookmarks | Low | None |
| P3-4 | Draft Issues | Low | None |
| P3-5 | Configurable Estimation | Low | None |
| P3-6 | User Onboarding Flow | Medium | None |
| P3-7 | Workspace-level Knowledge Base | Medium | None |

---

## 7. Infrastructure Dependencies

Several features share infrastructure dependencies. The recommended infrastructure evolution:

```
Current:  PostgreSQL + Next.js (monolith) + In-memory EventBus + SSE
    |
    v
Phase 1:  + Redis (cache + job queue + EventBus pub/sub)
          + S3/MinIO (file storage)
    |
    v
Phase 2:  + BullMQ Worker (background jobs)
          + EventBus upgrade to Redis pub/sub (multi-instance SSE)
    |
    v
Phase 3:  + Full-text search index
          + Analytics aggregation pipeline
```

**Docker Compose update** (target state):
```yaml
services:
  app:        # Next.js (API + Web)
  worker:     # BullMQ job processor
  db:         # PostgreSQL
  redis:      # Cache + Queue
  minio:      # File storage (self-hosted)
```

---

## 8. Conclusion

Chorus and Plane serve different niches but overlap in project management fundamentals. Plane's maturity in traditional PM features (30+ models, real-time collaboration, rich integrations) provides a clear reference for Chorus's evolution. However, **Chorus's AI-first architecture is its moat** — no amount of Plane development will replicate the MCP integration, session observability, and AI-DLC workflow that Chorus provides natively.

The recommended strategy:
1. **Protect the moat**: Continue strengthening AI-agent capabilities (notifications for agents, richer context injection, swarm observability)
2. **Close critical gaps**: Notifications, labels, file attachments — these are table-stakes for any collaboration tool (real-time updates are already working via SSE)
3. **Adopt selectively**: Not every Plane feature is needed. Prioritize features that enhance the AI-human collaboration loop
4. **Evolve the architecture**: Redis (to scale existing EventBus to multi-instance + caching + BullMQ) + S3 are the key infrastructure additions that unlock the most features

The goal is not to become Plane, but to build the best AI-human collaboration platform — learning from Plane's years of iteration while staying true to Chorus's unique AI-DLC vision.
