#!/usr/bin/env bash
# on-subagent-start.sh — SubagentStart hook
# Triggered SYNCHRONOUSLY when a sub-agent (teammate) is spawned.
#
# Name resolution: Claims a per-agent pending file written by PreToolUse:Task
# using atomic mv (only one process can successfully mv a given file).
#
# Session reuse logic:
#   1. List existing sessions via MCP
#   2. If a session with the same name exists and is active → reuse
#   3. If it exists but is closed → reopen
#   4. If not found → create new
#
# Writes a per-agent session file for sub-agent self-discovery (Plan A).
# Output: JSON with systemMessage (user) + additionalContext (Claude)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="${SCRIPT_DIR}/chorus-api.sh"

# Check environment
if [ -z "${CHORUS_URL:-}" ] || [ -z "${CHORUS_API_KEY:-}" ]; then
  exit 0
fi

# Read event JSON from stdin
EVENT=""
if [ ! -t 0 ]; then
  EVENT=$(cat)
fi

if [ -z "$EVENT" ]; then
  exit 0
fi

# Extract agent info from event
# Note: SubagentStart only provides agent_id and agent_type — NOT the name
# from the Task tool call. The name is captured by on-pre-spawn-agent.sh
# (PreToolUse:Task) and stored as a per-agent file in .chorus/pending/.
AGENT_ID=$(echo "$EVENT" | jq -r '.agent_id // .agentId // empty' 2>/dev/null) || true
AGENT_TYPE=$(echo "$EVENT" | jq -r '.agent_type // .agentType // empty' 2>/dev/null) || true

# Skip non-worker agent types (read-only agents don't need sessions)
case "${AGENT_TYPE,,}" in
  explore|plan|haiku|claude-code-guide|statusline-setup)
    exit 0
    ;;
esac

if [ -z "$AGENT_ID" ]; then
  exit 0
fi

# Claim a pending file written by PreToolUse:Task (on-pre-spawn-agent.sh).
# Each pending file represents one expected sub-agent spawn.
#
# Claim strategy (atomic mv — only one process can succeed per file):
#   1. Try exact match: mv .chorus/pending/{agent_type} → claimed/{agent_id}
#      (CC often sets agent_type to the name from the Task tool call)
#   2. Fallback: claim the oldest pending file (FIFO by modification time)
#
# If no pending file exists, this is an internal/cleanup agent → skip.
AGENT_NAME=""
PENDING_DIR="${CLAUDE_PROJECT_DIR:-.}/.chorus/pending"
CLAIMED_DIR="${CLAUDE_PROJECT_DIR:-.}/.chorus/claimed"
mkdir -p "$CLAIMED_DIR"

CLAIMED_FILE=""

# Strategy 1: exact match by agent_type (CC uses name as agent_type)
if [ -f "${PENDING_DIR}/${AGENT_TYPE}" ]; then
  if mv "${PENDING_DIR}/${AGENT_TYPE}" "${CLAIMED_DIR}/${AGENT_ID}" 2>/dev/null; then
    CLAIMED_FILE="${CLAIMED_DIR}/${AGENT_ID}"
    AGENT_NAME="$AGENT_TYPE"
  fi
fi

# Strategy 2: FIFO — claim oldest pending file
if [ -z "$CLAIMED_FILE" ] && [ -d "$PENDING_DIR" ]; then
  for candidate in $(ls -tr "$PENDING_DIR" 2>/dev/null); do
    if mv "${PENDING_DIR}/${candidate}" "${CLAIMED_DIR}/${AGENT_ID}" 2>/dev/null; then
      CLAIMED_FILE="${CLAIMED_DIR}/${AGENT_ID}"
      # Read name from file content if available
      FILE_NAME=$(jq -r '.name // empty' "$CLAIMED_FILE" 2>/dev/null) || true
      AGENT_NAME="${FILE_NAME:-$candidate}"
      break
    fi
    # mv failed → another process claimed it first, try next
  done
fi

# No pending file claimed → internal/cleanup agent → skip session creation
if [ -z "$CLAIMED_FILE" ]; then
  exit 0
fi

# Fallback: use agent_type + short ID if no name was captured
SESSION_NAME="${AGENT_NAME:-${AGENT_TYPE:-worker}-${AGENT_ID:0:8}}"

# === Session reuse: list existing sessions, find by name ===
SESSION_UUID=""
SESSION_ACTION=""  # "reused" | "reopened" | "created"

SESSIONS_LIST=$("$API" mcp-tool "chorus_list_sessions" '{}' 2>/dev/null) || true

if [ -n "$SESSIONS_LIST" ]; then
  # Find a session with matching name
  # The list may be an array or an object with a sessions array
  MATCH=$(echo "$SESSIONS_LIST" | jq -r --arg name "$SESSION_NAME" '
    (if type == "array" then . else (.sessions // []) end)
    | map(select(.name == $name))
    | sort_by(.updatedAt // .createdAt)
    | last
    // empty
  ' 2>/dev/null) || true

  if [ -n "$MATCH" ] && [ "$MATCH" != "null" ]; then
    MATCH_UUID=$(echo "$MATCH" | jq -r '.uuid // empty' 2>/dev/null) || true
    MATCH_STATUS=$(echo "$MATCH" | jq -r '.status // empty' 2>/dev/null) || true

    if [ -n "$MATCH_UUID" ]; then
      if [ "$MATCH_STATUS" = "active" ]; then
        # Active session found — reuse directly
        SESSION_UUID="$MATCH_UUID"
        SESSION_ACTION="reused"
        # Send heartbeat to refresh lastActiveAt
        "$API" mcp-tool "chorus_session_heartbeat" \
          "$(printf '{"sessionUuid":"%s"}' "$SESSION_UUID")" >/dev/null 2>&1 || true
      elif [ "$MATCH_STATUS" = "closed" ] || [ "$MATCH_STATUS" = "inactive" ]; then
        # Closed/inactive session — reopen
        REOPEN_RESPONSE=$("$API" mcp-tool "chorus_reopen_session" \
          "$(printf '{"sessionUuid":"%s"}' "$MATCH_UUID")" 2>/dev/null) || true
        REOPEN_UUID=$(echo "$REOPEN_RESPONSE" | jq -r '.uuid // empty' 2>/dev/null) || true
        if [ -n "$REOPEN_UUID" ]; then
          SESSION_UUID="$REOPEN_UUID"
          SESSION_ACTION="reopened"
        fi
      fi
    fi
  fi
fi

# === No existing session found — create new ===
if [ -z "$SESSION_UUID" ]; then
  RESPONSE=$("$API" mcp-tool "chorus_create_session" \
    "$(printf '{"name":"%s","description":"Auto-created by Chorus plugin for sub-agent %s (type: %s)"}' \
      "$SESSION_NAME" "$AGENT_ID" "${AGENT_TYPE:-unknown}")" 2>/dev/null) || {
    "$API" hook-output \
      "Chorus: failed to create session for '${SESSION_NAME}'" \
      "WARNING: Failed to create Chorus session for sub-agent '${SESSION_NAME}'. Session lifecycle will not be tracked." \
      "SubagentStart"
    exit 0
  }

  SESSION_UUID=$(echo "$RESPONSE" | jq -r '.uuid // empty' 2>/dev/null) || true

  if [ -z "$SESSION_UUID" ]; then
    SESSION_UUID=$(echo "$RESPONSE" | grep -oP '"uuid"\s*:\s*"([0-9a-f-]{36})"' | head -1 | grep -oP '[0-9a-f-]{36}') || true
  fi

  if [ -z "$SESSION_UUID" ]; then
    "$API" hook-output \
      "Chorus: session for '${SESSION_NAME}' — UUID not found in response" \
      "WARNING: Could not extract session UUID from response for sub-agent '${SESSION_NAME}'." \
      "SubagentStart"
    exit 0
  fi

  SESSION_ACTION="created"
fi

# === State: store mapping for other hooks (TeammateIdle, SubagentStop) ===
"$API" state-set "session_${AGENT_ID}" "$SESSION_UUID"
"$API" state-set "agent_for_session_${SESSION_UUID}" "$AGENT_ID"
"$API" state-set "session_${SESSION_NAME}" "$SESSION_UUID"
"$API" state-set "name_for_agent_${AGENT_ID}" "$SESSION_NAME"

# === Session file: write for sub-agent self-discovery (Plan A) ===
# The session file doubles as a PE injection point — sub-agents are instructed
# to read this file, so the "workflow" field gives them the complete Chorus
# workflow guide with concrete MCP call examples using their REAL sessionUuid.
SESSIONS_DIR="${CLAUDE_PROJECT_DIR:-.}/.chorus/sessions"
mkdir -p "$SESSIONS_DIR"

cat > "${SESSIONS_DIR}/${SESSION_NAME}.json" <<SESSIONEOF
{
  "sessionUuid": "${SESSION_UUID}",
  "agentId": "${AGENT_ID}",
  "agentName": "${SESSION_NAME}",
  "agentType": "${AGENT_TYPE:-unknown}",
  "chorusUrl": "${CHORUS_URL}",
  "sessionAction": "${SESSION_ACTION}",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workflow": [
    "=== Chorus Workflow — FOLLOW THESE STEPS ===",
    "",
    "Your Chorus session UUID is: ${SESSION_UUID}",
    "Your session name is: ${SESSION_NAME}",
    "The Chorus Plugin manages your session lifecycle automatically (heartbeat, close).",
    "Do NOT call chorus_create_session or chorus_close_session yourself.",
    "",
    "--- BEFORE starting work on a task ---",
    "",
    "1. Check in your session to the task (makes you visible in the Chorus UI):",
    "   chorus_session_checkin_task({ sessionUuid: \"${SESSION_UUID}\", taskUuid: \"<TASK_UUID>\" })",
    "",
    "2. Move the task to in_progress:",
    "   chorus_update_task({ taskUuid: \"<TASK_UUID>\", status: \"in_progress\", sessionUuid: \"${SESSION_UUID}\" })",
    "",
    "--- WHILE working ---",
    "",
    "3. Report progress periodically (after meaningful milestones):",
    "   chorus_report_work({ taskUuid: \"<TASK_UUID>\", report: \"Completed X. Files changed: ...\", sessionUuid: \"${SESSION_UUID}\" })",
    "",
    "--- AFTER completing the task ---",
    "",
    "4. Check out your session from the task:",
    "   chorus_session_checkout_task({ sessionUuid: \"${SESSION_UUID}\", taskUuid: \"<TASK_UUID>\" })",
    "",
    "5. Submit for human verification:",
    "   chorus_submit_for_verify({ taskUuid: \"<TASK_UUID>\", summary: \"What was done, files changed, test results.\" })",
    "",
    "Replace <TASK_UUID> with the actual Chorus task UUID provided in your prompt."
  ]
}
SESSIONEOF

# === Output ===
"$API" hook-output \
  "Chorus session ${SESSION_ACTION}: '${SESSION_NAME}' (${SESSION_UUID:0:8}...)" \
  "Chorus session ${SESSION_ACTION} for sub-agent '${SESSION_NAME}':
  Session UUID: ${SESSION_UUID}
  Session file: .chorus/sessions/${SESSION_NAME}.json (includes workflow instructions)

The session file now contains a 'workflow' field with complete Chorus instructions and MCP call examples pre-filled with the sub-agent's real sessionUuid. When the sub-agent reads this file, it gets everything it needs — no boilerplate required in the spawn prompt.

Team Lead only needs to include Chorus task UUID(s) in the sub-agent prompt. Example:
  Your Chorus task UUID: <task-uuid>
  Read .chorus/sessions/${SESSION_NAME}.json and follow the workflow instructions inside." \
  "SubagentStart"
