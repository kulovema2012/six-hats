---
name: six-hats
description: >-
  Run a task through a six-agent team — White (facts), Green (options and build), Yellow
  (payoff), Black (risk and verification), Red (gut reaction), Blue (control) — iterating up
  to three rounds against a written quality bar. Use whenever a task is complex,
  high-stakes, contested, or expensive to get wrong: architecture and design decisions,
  features of real size, security-sensitive changes, migrations across many files, debugging
  something that resisted a first attempt, client deliverables, launch and pricing
  decisions, or any work others will see. Use it whenever the user says "do this properly",
  "think hard about this", "I need this to be right", "use the team", "six hats", or "review
  this thoroughly". Also use it when a previous attempt was rejected or came back wrong,
  since a second solo attempt usually repeats the first one's blind spot. Do NOT use it for
  trivial, obvious, or trivially reversible tasks — it costs roughly six times the tokens.
---

# Six Hats

A task-execution team. Six agents with genuinely conflicting jobs work a task
through recon, design, build and review, iterating against a quality bar that
was written down before the work started.

Adapted from De Bono's Six Thinking Hats, with one deliberate change: De Bono's
hats only think. These ones execute. **GREEN builds the deliverable and BLACK
runs the tests.**

| Hat | Job |
|---|---|
| **WHITE** | Facts. Reads the real code, data and docs. Evidence for every claim. |
| **GREEN** | Options, then implementation. The only hat that writes the deliverable. |
| **YELLOW** | Payoff and the simplest path. The counterweight to Black. |
| **BLACK** | Risk, red team, and verification. Actually runs the tests. |
| **RED** | Gut reaction. First ten seconds, no analysis. |
| **BLUE** | Control. Owns the goal, the quality bar, the grade, the done-call. |

Full role briefs with failure modes: **`references/hats.md`** — read it before
briefing any agent. Tier selection, the round structure, fan-out rules and
escalation triggers: **`references/orchestration.md`** — read it before
assembling the team.

Invoke this skill in Codex by typing `$six-hats`, or let it trigger on its own
from a task that matches the description above.

---

## Step 1 — Pick a tier before anything else

Running six agents on a task that needed one is the main way this skill wastes
money. Decide the size first, state it in one line, and move.

| Tier | Team | Use when |
|---|---|---|
| **0** | none — just do it | Obvious, knowable, or trivially reversible |
| **1** | WHITE → BLACK | Needs checking against reality, one sensible approach |
| **2** | WHITE, GREEN, BLACK | Real work, real chance of being wrong. **Default when unsure.** |
| **3** | all six, one round | Approach genuinely contested, or other people will see it |
| **4** | all six, iterating, with fan-out | High stakes, wide surface, or a bar that won't be met first try |
| **5** | a scripted sweep, then all six | One operation repeated across dozens or hundreds of items |

Prefer one tier lower and escalate mid-flight. Escalating costs one round.
Starting too high costs the entire budget.

At Tier 0, do the work. Do not narrate the fact that a team was considered.

## Step 2 — BLUE sets the bar, in writing, before any work

This happens in the main thread and is cheap. Write to
`.sixhat/<date>-<slug>/00-goal.md`:

- **Goal statement** — one sentence, checkable. Not "improve the auth system"
  but "every route under `/api` rejects unauthenticated requests with 401,
  verified by a test".
- **Quality bar** — 3 to 6 criteria that a person could mark met or not met
  without arguing. Written now so it cannot be bent later to fit whatever got
  built.
- **Tier and round budget** — the tier chosen, why, and the budget (default 3).

If the task is genuinely ambiguous about what "good" means and the user is
present, ask now. One question here is cheaper than three wrong rounds.

If you are using the optional Stop hook, also write `.sixhat/active` now — see
"The state file" below.

## Step 3 — Run the round

Recon → Design → Build → Review → Grade. `references/orchestration.md` has the
full structure, what each hat receives, and why RED and BLACK must not see the
other hats' reasoning.

**Launch every agent in a stage together so they run concurrently.** The two
parallel stages are YELLOW ∥ BLACK reviewing options, and BLACK ∥ RED ∥ YELLOW
reviewing the build. Launching them one at a time throws away most of the
benefit.

Rounds 2 and 3 normally skip recon and design — they are just build and review
against specific findings, which makes them far cheaper than round 1.

## Step 4 — Stop honestly

PASS only when every bar item is met with evidence. REVISE with ordered,
specific instructions. ESCALATE immediately — regardless of round count — when
the next action is irreversible, when the hats disagree on something only the
user can settle, or when the bar itself turns out to be wrong.

**After three rounds without a pass, report that plainly.** Give the bar with
pass/fail per item and the specific blocker. Never pass work because the budget
ran out; a false pass is worse than an honest incomplete.

---

## Spawning the hats in Codex

Six subagent definitions ship with this package as TOML files. Install them to
`.codex/agents/` in the project, or `~/.codex/agents/` for personal use, then
spawn them by name:

`hat-white`, `hat-green`, `hat-yellow`, `hat-black`, `hat-red`, `hat-blue`

Ask for them the way you would ask for any Codex subagent — name the agent and
give it its inputs. There is nothing extra to set up per hat.

A subagent inherits the parent session's model, reasoning effort, sandbox
policy, permission mode, MCP servers and skills configuration **unless its own
file says otherwise.** A custom agent file may carry the same keys as a normal
session config — the documentation names `model`, `model_reasoning_effort`,
`sandbox_mode`, `mcp_servers` and `skills.config` — and a value in the agent
file beats the `[agents]` default in `config.toml`, which in turn beats the
parent's value.

These six files use that. WHITE, YELLOW and RED ship as `read-only`, because
none of them writes the deliverable; GREEN, BLACK and BLUE ship as
`workspace-write`, because GREEN builds, BLACK runs real tests and BLUE writes
the grade. Reasoning effort is set per hat — high for WHITE, GREEN, BLACK and
BLUE, medium for YELLOW, low for RED, whose entire value is the reaction before
the reasoning starts. `model` is left unset everywhere so the hats argue at one
level of ability.

**One caveat worth knowing before you rely on it.** Codex reapplies the parent
turn's live runtime overrides when it spawns a child — the sandbox and approval
choices you made interactively during the session, such as a `/permissions`
change or starting with `--yolo` — even when the chosen agent file sets
different defaults. So a hat's `sandbox_mode` is a default, not a guarantee. If
the session is running wide open, so is the hat.

**If the agent files are not installed**, run the method anyway. Spawn plain
subagents and paste that hat's brief from `references/hats.md` at the top of
each prompt. The method is identical; only the pre-set role descriptions are
lost. Do not skip the skill because the files are missing, and do not stop to
ask the user to install them.

### The thing that is different in Codex: nobody merges for you

**Codex subagents do not share intermediate work with each other.** Each one
starts from the prompt you give it and returns its result to the parent thread.
There is no shared scratch space they all see.

This is mostly good — it is why RED really does arrive uncontaminated and why
YELLOW and BLACK genuinely cannot anchor on each other. But it moves one job
onto you:

- **Write every hat's report to the run folder as soon as it comes back.** The
  run folder is not just an audit trail here; it is the only channel between
  one hat and the next.
- **Point each hat at the paths it should read**, or paste the content into its
  prompt. A hat cannot see a file you merely thought about.
- **Merge the review stage yourself before handing it to BLUE.** If you give
  BLUE three raw returns instead of a written review file, BLUE grades an
  impression rather than a record — which is the exact failure this method
  exists to prevent.

### Briefing an agent

Every hat prompt carries four things:

1. **The hat's brief.** The installed TOML agents already carry it in their
   `developer_instructions`. If you are using plain subagents instead, paste
   the brief verbatim from `references/hats.md` — including its failure mode,
   which is the part that does the work.
2. **Only the inputs that hat should see** (the table in `orchestration.md`
   §3). WHITE gets the task alone. RED gets the deliverable alone.
3. **The output path** — `.sixhat/<run>/NN-<hat>.md` — so the run log builds
   itself. Say the path explicitly; the agent cannot guess your run folder.
   Note that WHITE, YELLOW and RED ship as `read-only` and may not be able to
   write there at all. They return the report in their final message and you
   file it, which you should be doing anyway — see "nobody merges for you"
   above.
4. **The required output shape.** BLACK returns findings as
   trigger → consequence → severity. RED returns a one-line verdict then at
   most three reactions. BLUE returns the bar item by item with evidence.

### Where GREEN builds — and why there is no isolated copy

**Codex has no per-subagent isolation of the working tree.** There is no
`isolation`, `worktree`, `cwd` or `working_directory` field in the agent file
or anywhere in the config system. Every subagent of a session works in the
parent's workspace, on the same checkout, at the same time. A bad GREEN round
lands on the real files.

Codex does have worktrees, but they are a **chat-level feature of the ChatGPT
desktop app**: you select "Worktree" under the composer when you start the
chat, the copy lives in `$CODEX_HOME/worktrees`, the most recent fifteen are
kept, and it belongs to that one chat. It cannot be handed to a subagent. If
you want real isolation for a six-hats run, that is the lever, and it has to be
pulled by the human before the run starts.

Inside a run, the package compensates with patches rather than pretending the
isolation exists. GREEN's brief tells it to capture `git diff` into
`.sixhat/<run>/before.patch` before it touches anything, and its own diff into
`.sixhat/<run>/round-N.patch` afterwards, so any round can be undone with
`git apply -R`. Codex's own guidance recommends exactly this shape — prefer
patch-based workflows such as `git diff` and `git apply` over editing tracked
files directly, and commit often so you can roll back in small increments.

Two things to be honest about rather than assume:

- **Committing may or may not work.** Under `sandbox_mode = "workspace-write"`
  the writable set is the workspace plus `$TMPDIR` and `/tmp`, but
  `<workspace>/.git` is carved back out as read-only, recursively, whether it
  is a directory or a pointer file — and `.agents` and `.codex` with it. The
  documentation states the protection but **does not say what happens when a
  write to a protected path is attempted**: it may fail, or it may become an
  approval request, and an `allow` decision in the `.rules` system runs a
  command outside the sandbox without prompting at all. So ask GREEN to branch
  and commit if you want that safety net, and have it report whether it
  actually worked. Do not write instructions that depend on it.
- **A branch is still worth having where it works**, because a branch survives
  a crash and a loose patch file in the workspace may not. It is a bonus, not
  the plan.

Merging to a shared branch, pushing, deploying or publishing is an escalation,
not a build step, whatever the sandbox would technically permit.

---

## Long-running work: the optional Stop hook

A Tier 4 run can outlast a single turn. The package ships an optional Codex
Stop hook that keeps the run going: when the main thread tries to end, the hook
checks whether the run is finished and, if it is not, asks Codex to continue.

**The skill works fine without it.** The hook only saves you from having to
type "continue" between rounds.

### The state file

The hook cannot read your conversation, so the run has to leave it a note. That
note is `.sixhat/active`, a single JSON object:

```json
{
  "run": ".sixhat/2026-09-21-auth-401",
  "round": 1,
  "max_rounds": 3,
  "status": "running"
}
```

Keep it honest, because the hook trusts it:

- Write it when the run starts — `status: "running"`, `round: 1`.
- Bump `round` each time BLUE returns REVISE.
- Set `status` to `"pass"` on a PASS, `"escalated"` on an escalation, or
  `"failed"` when the budget is spent without a pass.

The hook allows the turn to end whenever `status` is anything other than
`"running"`, whenever `round` has reached `max_rounds`, and whenever the file
is missing. It deletes the file once the run is over, so a stale file from a
crashed run cannot hold a later session hostage. Installation is in
`INSTALL.md`.

### The optional BLACK findings hook

The package also ships a small `SubagentStop` hook that watches one hat. Unlike
`Stop`, the `SubagentStop` event supports a matcher and applies it to
`agent_type`, so a hook can be pointed at `hat-black` alone. If BLACK finishes
with neither a finding nor a list of what it checked and found clean, the hook
sends it back for one more pass — once, then it lets go.

It enforces nothing the brief does not already say; it just catches the one
failure that looks like success. If it is not installed, hold BLACK to the same
rule yourself: a BLACK report that says "looks good" is a failed report and
goes back.

## Tier 5 — when the surface is too wide for agents

Some tasks are one mechanical operation repeated across dozens or hundreds of
items: audit every route handler, convert every file, check every record. Six
agents cannot cover that, and a fan-out that wide produces more results than
can be merged well.

**Codex has no `Workflow` tool or equivalent** — there is no scripted
per-item orchestration built in. Two honest ways to do it:

1. **Fan out from the parent thread.** Launch one subagent per unit from the
   main thread, in batches, and collect the returns. The ceiling is
   `agents.max_concurrent_threads_per_session`; launching more than that
   queues the extras rather than failing, so the sweep still finishes, it is
   just slower. Keep the per-unit prompt identical and mechanical, and keep
   each return short — a sweep whose results do not fit together is a sweep
   that has to be run again.

2. **Have the user run one `codex exec` per unit, outside the session.** This
   is the better option when the surface is genuinely large or the units are
   separate directories, because each run gets its own context instead of
   sharing one. `codex exec --cd <dir>` sets the working directory per run,
   and the flags that make the results collectable are `--json` for a
   structured event stream, `-o` / `--output-last-message <file>` to capture
   the final message, and `--output-schema <file>` to force the last message
   into a JSON shape you specify. Write the loop, hand it over, and judge what
   comes back.

**Writes need more care here than reads.** Every subagent of a session shares
one workspace, and Codex warns plainly that agents editing code at once create
conflicts and add coordination overhead — and offers no mechanism against it.
So fan out reads as wide as you like, and keep writes to one agent at a time
unless the units are genuinely disjoint files.

Either way the hats still own the judgement: WHITE defines what the sweep
should look for, the sweep runs, and BLACK and BLUE grade what came back
against the bar. A sweep is a data-gathering instrument, not a replacement for
the team.

## Handing off to another tool

`99-result.md` in the run folder is written to be read cold by someone who saw
none of the run. Hand over that file plus the current diff — not the
conversation.

---

## What makes a run good

**The hats must disagree.** A round where all six approve is a failed round,
not a successful one: it means they collapsed into a single voice, and the
whole exercise cost six times the tokens to get one model's opinion. If a
round produces no disagreement at all, note it in the run log and treat the
pass with suspicion.

**Findings must be specific enough to act on.** "Consider adding error
handling" is not a finding and should be sent back. "`sync.ts:42` — a 429
response retries forever with no backoff, so a rate-limited account hangs the
worker permanently — HIGH" is a finding.

**The bar is written first and graded honestly.** Everything else in this
skill is machinery in service of that one rule.
