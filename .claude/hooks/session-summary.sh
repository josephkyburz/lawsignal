#!/bin/bash
# PreToolUse hook — fires before the first tool call of a session.
# Reads the last 5 entries from .claude/memory/sessions.jsonl and
# outputs them as context so the new session has immediate awareness
# of recent work.
#
# Also outputs any open questions from .claude/memory/open-questions.md
# and the count of skills-learned entries by pattern tag.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SESSIONS_FILE="$PROJECT_ROOT/.claude/memory/sessions.jsonl"
QUESTIONS_FILE="$PROJECT_ROOT/.claude/memory/open-questions.md"
SKILLS_FILE="$PROJECT_ROOT/.claude/memory/skills-learned.md"

# --- Recent sessions ---
if [ -s "$SESSIONS_FILE" ]; then
  ENTRY_COUNT=$(wc -l < "$SESSIONS_FILE" | tr -d ' ')
  echo "[session-memory] Last ${ENTRY_COUNT} session(s) on record. Most recent:" >&2
  tail -5 "$SESSIONS_FILE" | while IFS= read -r line; do
    # Extract summary and branch for human-readable output
    SUMMARY=$(echo "$line" | grep -o '"summary":"[^"]*"' | head -1 | sed 's/"summary":"//;s/"$//')
    BRANCH=$(echo "$line" | grep -o '"branch":"[^"]*"' | head -1 | sed 's/"branch":"//;s/"$//')
    DATE=$(echo "$line" | grep -o '"date":"[^"]*"' | head -1 | sed 's/"date":"//;s/"$//')
    if [ -n "$SUMMARY" ]; then
      echo "  $DATE [$BRANCH] $SUMMARY" >&2
    fi
  done
else
  echo "[session-memory] No prior sessions recorded yet." >&2
fi

# --- Open questions ---
if [ -s "$QUESTIONS_FILE" ]; then
  # Count non-empty, non-header lines after the separator
  Q_COUNT=$(grep -c "^- " "$QUESTIONS_FILE" 2>/dev/null || echo "0")
  if [ "$Q_COUNT" -gt "0" ]; then
    echo "[session-memory] $Q_COUNT open question(s) — see .claude/memory/open-questions.md" >&2
  fi
fi

# --- Skills pattern summary ---
if [ -s "$SKILLS_FILE" ]; then
  PATTERN_COUNT=$(grep -c "^### " "$SKILLS_FILE" 2>/dev/null || echo "0")
  if [ "$PATTERN_COUNT" -gt "0" ]; then
    echo "[session-memory] $PATTERN_COUNT skill log entries. Top patterns:" >&2
    grep "pattern:" "$SKILLS_FILE" 2>/dev/null | sed 's/.*pattern://' | sort | uniq -c | sort -rn | head -5 | while read count tag; do
      echo "  ${count}x $tag" >&2
    done
  fi
fi

exit 0
