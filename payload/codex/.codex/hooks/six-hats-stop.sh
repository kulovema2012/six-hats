#!/bin/sh
# six-hats-stop.sh — optional Codex Stop hook for the six-hats skill.
#
# WHAT IT DOES
#   When the main Codex thread tries to end a turn, this hook checks whether a
#   six-hats run is still in progress. If the run has not reached a PASS and the
#   round budget is not spent, it asks Codex to keep going. Otherwise it gets
#   out of the way and cleans up.
#
#   The skill works perfectly well without this hook. All it saves you is
#   typing "continue" between rounds.
#
# HOW CODEX TALKS TO IT (verified against https://learn.chatgpt.com/docs/hooks)
#   Input:  one JSON object on stdin. Shared fields include session_id, cwd,
#           hook_event_name, transcript_path, model, permission_mode. The Stop
#           event adds turn_id, stop_hook_active and last_assistant_message.
#   Output: to block the stop and force continuation, print
#               {"decision": "block", "reason": "<continuation prompt>"}
#           on stdout and exit 0. The documented alternative is to exit with
#           code 2 and write the reason to stderr. This script uses the JSON
#           form, which is the form the documentation shows as its example.
#           To allow the stop, print nothing and exit 0.
#
#   NOTE ON A CONFUSING PAIR OF FIELDS: `continue: false` does NOT mean
#   "continue". It is the generic field that HALTS a session. The field that
#   keeps Codex working is `decision: "block"`. Do not swap them.
#
# SAFETY
#   This hook can make Codex keep working on its own, so it is written to fail
#   open: every unexpected condition results in the turn being ALLOWED to end.
#   Missing jq, missing state file, unreadable JSON, a spent budget, or a state
#   file that stopped making progress all allow the stop. There is also a hard
#   cap on how many times it will ever block within one run.

set -u

STATE_REL=".sixhat/active"

# ---- read the event ---------------------------------------------------------
# If stdin is empty or unreadable we have no basis to block, so allow the stop.
INPUT=$(cat 2>/dev/null) || exit 0
[ -n "$INPUT" ] || exit 0

# ---- jq is required to read the event and the state file --------------------
# Without it we cannot tell whether a run is active, so allow the stop.
command -v jq >/dev/null 2>&1 || exit 0

CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null) || exit 0
[ -n "$CWD" ] || CWD=$PWD
[ -d "$CWD" ] || exit 0

# stop_hook_active tells us whether this turn was already continued by a Stop
# hook. We read it but deliberately do NOT exit on it alone: a six-hats run is
# expected to need several continuations, so treating the first one as final
# would make the hook almost useless. The counters below are what actually
# bound the loop, and they are bounded absolutely. If you would rather have the
# strictest possible behaviour — at most one continuation per turn, ever —
# uncomment the next two lines.
ALREADY=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || ALREADY=false
# [ "$ALREADY" = "true" ] && exit 0
: "$ALREADY"

STATE="$CWD/$STATE_REL"

# No state file means no six-hats run is active. Nothing to do.
[ -f "$STATE" ] || exit 0

# A state file that is not valid JSON is a broken run, not a reason to loop.
jq -e . "$STATE" >/dev/null 2>&1 || {
  rm -f "$STATE"
  exit 0
}

# ---- read the state ---------------------------------------------------------
STATUS=$(jq -r '.status // "running"'          "$STATE")
VERDICT=$(jq -r '(.verdict // "") | ascii_upcase' "$STATE")
ROUND=$(jq -r  '.round // 1'                   "$STATE")
MAXR=$(jq -r   '.max_rounds // 3'              "$STATE")
CONT=$(jq -r   '.continuations // 0'           "$STATE")
LASTR=$(jq -r  '.last_continued_round // 0'    "$STATE")
STALL=$(jq -r  '.stall // 0'                   "$STATE")

# Anything non-numeric is treated as a broken run.
case "$ROUND$MAXR$CONT$LASTR$STALL" in
  *[!0-9]*) rm -f "$STATE"; exit 0 ;;
esac

# Absolute ceiling on blocks per run: two turns per round, never more.
# This is the backstop that guarantees the hook cannot loop forever even if the
# rest of the state file is wrong.
HARD_CAP=$(( MAXR * 2 ))

finish() {
  # The run is over. Remove the state file so a later session is never held
  # hostage by a leftover marker from a crashed run.
  rm -f "$STATE"
  exit 0
}

# ---- reasons to allow the stop ----------------------------------------------
# BLUE has recorded a status other than "still running": pass, escalation, or
# an honest failure. All three mean the run is finished.
[ "$STATUS" = "running" ] || finish

# Belt and braces on the same question. "status" is the field this hook asks
# BLUE to set, but "verdict" is the word BLUE uses everywhere else in the
# method, so a model will sometimes write the verdict and leave the status
# alone. Treating either field as authoritative costs nothing and avoids the
# worst failure this hook could have: holding a finished run open for extra
# rounds because the wrong key was written.
case "$VERDICT" in
  PASS|ESCALATE|ESCALATED|FAILED) finish ;;
esac

# The round budget is spent. BLUE reports honestly rather than passing; there
# is nothing for another turn to do.
[ "$ROUND" -lt "$MAXR" ] || finish

# The hard cap has been reached.
[ "$CONT" -lt "$HARD_CAP" ] || finish

# Stall guard: if we already continued twice for this same round and the round
# number has not moved, the run is not making progress. Continuing again would
# just burn tokens, so let the turn end and let a human look at it.
if [ "$ROUND" -eq "$LASTR" ] && [ "$STALL" -ge 2 ]; then
  finish
fi

# ---- record that we are about to block --------------------------------------
if [ "$ROUND" -eq "$LASTR" ]; then
  NEW_STALL=$(( STALL + 1 ))
else
  NEW_STALL=1
fi
NEW_CONT=$(( CONT + 1 ))

TMP="$STATE.tmp.$$"
if jq --argjson c "$NEW_CONT" --argjson r "$ROUND" --argjson s "$NEW_STALL" \
      '.continuations = $c | .last_continued_round = $r | .stall = $s' \
      "$STATE" > "$TMP" 2>/dev/null && mv "$TMP" "$STATE" 2>/dev/null; then
  :
else
  # If we cannot record the block, we cannot guarantee we will not loop.
  # Fail open.
  rm -f "$TMP" 2>/dev/null
  exit 0
fi

# ---- block the stop ---------------------------------------------------------
REASON=$(printf '%s' \
"A six-hats run is still in progress (round $ROUND of $MAXR). " \
"Read .sixhat/active for the run folder, then continue the run from where it " \
"stopped: finish the current stage, have BLUE grade the work against the " \
"written quality bar item by item, and record the verdict. " \
"When BLUE returns PASS, set \"status\" to \"pass\" in .sixhat/active. " \
"On an escalation set it to \"escalated\" and stop. " \
"If the round budget is spent without a pass, set it to \"failed\" and report " \
"honestly what is still failing. Increment \"round\" whenever BLUE returns " \
"REVISE. Do not pass work just to end the run.")

jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0
