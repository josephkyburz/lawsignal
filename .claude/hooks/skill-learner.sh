#!/bin/bash
# PostToolUse hook — fires after Bash tool calls.
# Filters for `git commit` commands. When detected, appends a structured
# entry to .claude/memory/skills-learned.md with:
#   - Timestamp, branch, commit message
#   - Files changed
#   - Auto-detected pattern tag (ingest, ui, api, docs, data-fix, infra, scoring)
#
# The companion skill (skill-synthesis.md) periodically reviews this log
# and proposes new skills when 3+ entries share a pattern tag.

set -e

INPUT=$(cat)

# Only act on Bash tool calls that contain "git commit"
if ! echo "$INPUT" | grep -q '"tool".*[Bb]ash'; then
  exit 0
fi
if ! echo "$INPUT" | grep -q 'git commit'; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MEMORY_FILE="$PROJECT_ROOT/.claude/memory/skills-learned.md"

cd "$PROJECT_ROOT"

# Bail if no commits exist yet
if ! git rev-parse HEAD >/dev/null 2>&1; then
  exit 0
fi

BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "unknown")
COMMIT_HASH=$(git log -1 --pretty=format:"%h" 2>/dev/null || echo "unknown")
FILES_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | head -20 || echo "unknown")

# Auto-detect pattern tag from files changed
TAG="general"
if echo "$FILES_CHANGED" | grep -q "scripts/ingest/"; then
  TAG="ingest"
elif echo "$FILES_CHANGED" | grep -q "scripts/lib/"; then
  TAG="ingest-lib"
elif echo "$FILES_CHANGED" | grep -q "functions/api/"; then
  TAG="api"
elif echo "$FILES_CHANGED" | grep -q "src/components/"; then
  TAG="ui"
elif echo "$FILES_CHANGED" | grep -q "src/lib/"; then
  TAG="scoring"
elif echo "$FILES_CHANGED" | grep -q "src/data/firms"; then
  TAG="data-fix"
elif echo "$FILES_CHANGED" | grep -q "docs/"; then
  TAG="docs"
elif echo "$FILES_CHANGED" | grep -q "migrations/"; then
  TAG="schema"
elif echo "$FILES_CHANGED" | grep -q ".claude/"; then
  TAG="infra"
fi

# Append entry
cat >> "$MEMORY_FILE" << EOF

### $TIMESTAMP | \`$BRANCH\` | pattern:$TAG
**Commit:** $COMMIT_HASH — $COMMIT_MSG
**Files:**
$(echo "$FILES_CHANGED" | sed 's/^/- /')

EOF

exit 0
