#!/usr/bin/env bash
# pre-push-check.sh — PreToolUse Bash hook
#
# Gates `git push` on the merchant console's own quality bar: its tests and
# its production build must both pass before a push is allowed through.
#
# - Not a git push -> exit 0, no output, nothing gated.
# - `npm test` or `npm run build` fails -> permissionDecision: deny, naming
#   which one failed and the log file with the full output.
# - Both pass -> permissionDecision: allow.

set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || true)

if [[ -z "$CMD" ]]; then
  exit 0
fi

# Flatten to one line and strip quoted strings before matching, so "git push"
# appearing inside quoted data (e.g. a commit message) doesn't trip this gate,
# while a real `git push` anywhere in a compound command (cd x && git push,
# git push && echo done) still matches.
CMD_CLEAN=$(printf '%s' "$CMD" | tr '\n' ' ' | sed 's/"[^"]*"//g; s/'"'"'[^'"'"']*'"'"'//g')

if ! echo "$CMD_CLEAN" | grep -qE '\bgit[[:space:]]+push\b'; then
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "$REPO_ROOT" ]]; then
  # Can't find a repo root from here — don't block on a check we can't run.
  exit 0
fi

APP_DIR="$REPO_ROOT/build-battle/merchant-console"
if [[ ! -f "$APP_DIR/package.json" ]]; then
  exit 0
fi

TEST_LOG="/tmp/claude-pre-push-test.log"
BUILD_LOG="/tmp/claude-pre-push-build.log"

deny() {
  jq -n --arg reason "$1" \
    '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": $reason}}'
  exit 0
}

if ! (cd "$APP_DIR" && npm test) >"$TEST_LOG" 2>&1; then
  deny "Push blocked: \`npm test\` failed in build-battle/merchant-console. See the full output with: cat $TEST_LOG"
fi

if ! (cd "$APP_DIR" && npm run build) >"$BUILD_LOG" 2>&1; then
  deny "Push blocked: \`npm run build\` failed in build-battle/merchant-console. See the full output with: cat $BUILD_LOG"
fi

jq -n '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "permissionDecisionReason": "npm test and npm run build both passed in build-battle/merchant-console."}}'
