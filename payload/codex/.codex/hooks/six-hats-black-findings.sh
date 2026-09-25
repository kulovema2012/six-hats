#!/bin/sh
# six-hats-black-findings.sh — OPTIONAL Codex SubagentStop hook for the BLACK hat.
#
# WHAT IT DOES
#   The BLACK hat has one rule it must not break: it produces at least one
#   finding, or it says explicitly what it checked and found clean. "Looks good"
#   is a failed BLACK report. This hook reads BLACK's last message as the
#   subagent finishes and, if neither a finding nor a clean-check list is there,
#   asks Codex to send BLACK back for another pass.
#
#   It is optional. The method works without it; the hook only catches the one
#   failure that is easy to miss because it looks like success.
#
# HOW CODEX TALKS TO IT (verified against https://learn.chatgpt.com/docs/hooks)
#   Event:  SubagentStop. Unlike Stop, this event DOES support a matcher, and
#           the matcher is applied to `agent_type` — the subagent type or
#           profile. That is what lets this hook target one hat instead of
#           every subagent in the run.
#   Input:  one JSON object on stdin. In addition to the common fields it
#           carries turn_id, agent_id, agent_type, agent_transcript_path,
#           stop_hook_active and last_assistant_message.
#   Output: JSON on stdout with exit 0. To ask Codex to continue the subagent
#           flow, print {"decision": "block", "reason": "..."}. Plain text
#           output is invalid for this event. Printing nothing lets the
#           subagent finish.
#
#   WHAT "BLOCK" MEANS HERE: it asks Codex to keep the subagent working. It is
#   not a rejection and it does not delete BLACK's answer. Do not confuse it
#   with `continue: false`, which halts things.
#
# INFERENCE, MARKED AS SUCH
#   The documentation says the matcher filters on "subagent type" and that the
#   values "depend on the subagent that stops". It does not state that a custom
#   agent file's `name` is that value. This package assumes it is — the matcher
#   below is "hat-black" — and the script re-checks `agent_type` itself so that
#   a wrong guess simply means the hook never fires. It will not misfire on
#   another hat.
#
# SAFETY
#   Fails open, every time. Missing jq, unreadable input, an empty message, a
#   subagent that is not BLACK, or a pass that already happened all let the
#   subagent finish. It will continue BLACK at most once.

set -u

INPUT=$(cat 2>/dev/null) || exit 0
[ -n "$INPUT" ] || exit 0

# Without jq we cannot read the event at all, so get out of the way.
command -v jq >/dev/null 2>&1 || exit 0

EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null) || exit 0
[ "$EVENT" = "SubagentStop" ] || exit 0

# Belt and braces on the matcher. If this is not the BLACK hat — or if this
# build of Codex reports an agent_type we do not recognise — do nothing.
AGENT=$(printf '%s' "$INPUT" | jq -r '.agent_type // empty' 2>/dev/null) || exit 0
case "$AGENT" in
  *hat-black*|*hat_black*) : ;;
  *) exit 0 ;;
esac

# Only ever send BLACK back once. A second pass that still produces nothing is
# a real answer about the work, not a reason to loop.
ALREADY=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || exit 0
[ "$ALREADY" = "true" ] && exit 0

MSG=$(printf '%s' "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null) || exit 0
# No message to judge means no basis to block.
[ -n "$MSG" ] || exit 0

# Pull out the body of a "## <heading>" section, stopping at the next heading.
section() {
  printf '%s\n' "$MSG" | awk -v want="$1" '
    /^##+[ \t]/ {
      line = $0
      sub(/^##+[ \t]+/, "", line)
      inside = (tolower(line) ~ tolower(want))
      next
    }
    inside { print }
  '
}

# A section counts as filled if it has at least one list item with real words in
# it. Two things do not count: an item that is only a <placeholder>, and an item
# that still carries the literal slots from the output template in hat-black.toml
# (`[SEVERITY]`, `<location>`, `<trigger>`, `<consequence>`, `<what you ...>`).
# A hat that echoed the template has not reported anything.
has_item() {
  printf '%s\n' "$1" \
    | grep -E '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+' \
    | grep -vE '^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+<[^>]*>[[:space:]]*$' \
    | grep -qvE '\[SEVERITY\]|<location>|<trigger>|<consequence>|<what[^>]*>'
}

FINDINGS=$(section "findings")
CLEAN=$(section "checked and clean")

if has_item "$FINDINGS" || has_item "$CLEAN"; then
  exit 0
fi

REASON=$(printf '%s' \
"Your report has neither a finding nor a list of what you checked and found " \
"clean, and the BLACK hat is not allowed to end there — silence is not a pass. " \
"Go back to the work and do one more pass. Either produce at least one finding " \
"in the form [SEVERITY] <location> - <concrete trigger> -> <concrete " \
"consequence>, or write a '## Checked and clean' list naming exactly what you " \
"verified and how, with the commands and exit codes. If the sandbox blocked a " \
"check you needed, say which command was blocked; an unrun check is not a pass " \
"and is itself worth reporting.")

jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0
