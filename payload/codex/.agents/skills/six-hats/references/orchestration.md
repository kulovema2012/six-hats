# Orchestration mechanics (Codex)

How the team is actually assembled and run. Read `hats.md` for what each hat
does; this file covers how many of them to use, in what order, with what
parallelism, and when to stop.

This is the Codex version of the canonical orchestration file. The method is
identical to the Claude version. Only the parts that depend on the host tool
have been changed, and each change is marked so you can tell what is method and
what is plumbing.

---

## 1. Scale first — most tasks do not need a team

The single fastest way to make this skill useless is to run six agents on
something that needed one. Six agents cost roughly six times the tokens and
add a full round-trip of latency; that price is worth paying only when a wrong
answer is expensive or the problem genuinely has multiple defensible
approaches.

Pick a tier before anything else, and say which tier was picked and why.

### Tier 0 — Solo. No team.

The answer is knowable, the path is obvious, or the change is trivially
reversible. Fix a typo, answer a question, rename a variable, write a short
script, explain how something works.

**Just do the task.** Do not announce that you considered the team. If the task
turns out to be harder than it looked, escalate to Tier 2 mid-flight.

### Tier 1 — Two hats: WHITE then BLACK.

Something needs checking against reality, and then checking for holes, but
there is only one sensible approach. Bug fixes with a known cause, small
well-specified features, reviewing something that already exists.

### Tier 2 — Three hats: WHITE, GREEN, BLACK.

Real work with a real chance of being wrong, but the approach is not in
serious dispute. This is the common case and should be the default when
unsure.

### Tier 3 — All six, one round.

The approach is genuinely contested, several things could go wrong, or the
output will be seen by people who are not you. New features of real size,
architecture decisions, client deliverables, anything with a human on the
other end.

### Tier 4 — All six, iterating, with fan-out underneath.

High stakes, wide surface, or a quality bar that will not be met on the first
attempt. Security-sensitive work, migrations across many files, launch
decisions, anything expensive to get wrong.

At this tier the hats themselves delegate — see §4.

### Tier 5 — A scripted sweep, then all six.

One mechanical operation repeated across dozens or hundreds of items: audit
every route handler, convert every file, check every record. Six agents cannot
cover that surface, and a fan-out that wide returns more than can be merged
well.

The sweep gathers; the hats judge what it gathered. See "Very wide surfaces"
in §4 for how to run it in Codex, which has no built-in per-item orchestration
tool.

**When in doubt, pick one tier lower and escalate.** Escalating costs one extra
round. Starting too high costs the whole budget.

---

## 2. The round

A round has four stages. Stages 2 and 4 are where the parallelism lives —
launch every agent in a stage together so they run concurrently.

```
  ┌─ RECON ────────────────────────────────────────────┐
  │  WHITE alone. Ground truth, with evidence.          │
  └────────────────────────────────────────────────────┘
                        │
  ┌─ DESIGN ───────────────────────────────────────────┐
  │  GREEN proposes 2–3 approaches                      │
  │         ↓                                           │
  │  YELLOW ║ BLACK   ← in parallel, reviewing options  │
  │         ↓                                           │
  │  BLUE picks one, on the record, with a reason       │
  └────────────────────────────────────────────────────┘
                        │
  ┌─ BUILD ────────────────────────────────────────────┐
  │  GREEN implements the chosen approach               │
  └────────────────────────────────────────────────────┘
                        │
  ┌─ REVIEW ───────────────────────────────────────────┐
  │  BLACK ║ RED ║ YELLOW   ← in parallel               │
  │  (tests+risk) (gut)  (did we lose the point?)       │
  │         ↓                                           │
  │  BLUE grades against the written bar                │
  └────────────────────────────────────────────────────┘
                        │
              PASS / REVISE / ESCALATE
```

**Round 2 and later skip RECON** unless round 1 showed WHITE's facts were
wrong, in which case re-running recon is the whole point of the round. They
also usually skip DESIGN — the approach was already chosen. A revision round
is normally just BUILD and REVIEW, which makes it much cheaper than round 1.

**Round budget: 3.** After three rounds, BLUE reports honestly rather than
passing. See §5.

### Codex note — how the parallel stages actually work

In Codex, subagents run as separate threads and **the parent thread is the only
place their results come back together.** Subagents do not see each other's
intermediate work.

That has two practical consequences, and they are the reason this note exists
rather than a bare instruction:

1. **The parallel stages are genuinely parallel and genuinely independent.**
   YELLOW and BLACK reviewing the same set of options cannot read each other
   mid-flight, so neither can anchor on the other. That is exactly what the
   method wants — it is the reason those two are run side by side in the first
   place.

2. **Merging is your job, in the parent thread.** Nobody downstream will do it
   for you. When BLACK, RED and YELLOW come back, write their findings into the
   run folder yourself and hand BLUE the merged set. If you skip this step and
   just pass BLUE a pile of raw returns, BLUE grades an impression instead of a
   record, which is the failure this whole method exists to prevent.

Concurrency is capped by `agents.max_concurrent_threads_per_session`. If you
launch more hats than that limit, the extras queue rather than fail — the round
still completes, it is just slower. There is no need to work around it.

---

## 3. Feeding the hats

Each hat gets only what it needs. Passing every agent the full transcript
wastes context and blurs the roles.

| Hat | Receives |
|---|---|
| WHITE | The task. Nothing else — no prior opinions to anchor on. |
| GREEN (design) | Task, WHITE's report, the quality bar |
| YELLOW / BLACK (on options) | Task, GREEN's options, WHITE's unknowns list |
| GREEN (build) | The chosen approach, BLUE's reason, the findings to address |
| BLACK / RED / YELLOW (on build) | The deliverable, the quality bar, what GREEN says it left out |
| BLUE | Everything |

Two rules that matter more than they look:

- **Never show RED the other hats' reasoning.** RED's value comes from an
  uncontaminated first reaction. Give it the output and nothing else.
- **Never tell BLACK what the previous BLACK round found** until it has
  formed its own view, or it will confirm rather than re-examine.

**Codex note.** A Codex subagent starts from the prompt you give it, not from
the parent conversation, so these two rules are easy to honour: simply do not
put that material in the prompt. The risk runs the other way instead — it is
easy to under-feed a hat by forgetting that it cannot see anything you did not
write down. Give each hat the file paths it needs to read, or paste the content
in directly.

---

## 4. Fan-out: when the hats delegate

At Tier 4, individual hats spawn their own subagents. This is what makes wide
problems tractable — one WHITE agent reading 60 files sequentially is slow and
will summarise; twelve subagents reading five files each and reporting
verified findings is fast and specific.

**Where fan-out pays:**

- **WHITE** across a wide surface — one subagent per module, per service, per
  data source, per document. Each returns verified facts with evidence, and
  WHITE merges them into one report.
- **BLACK** across attack surfaces — one per threat class (input validation,
  auth, concurrency, failure/retry, data integrity), or one per changed file
  on a large diff.
- **GREEN** across independent units — one per file or per component, but only
  where the units genuinely do not interact. Coordination cost eats the gain
  fast; if the pieces touch each other, build them in one agent.

**Where fan-out does not pay:** anything needing a single coherent judgement.
Do not split BLUE. Do not split RED — a first reaction cannot be parallelised.
Do not split a design that has to hang together.

> **Codex note — fan out reads freely, fan out writes carefully.** Every
> subagent in a session shares the parent's workspace. There is no per-agent
> worktree, working directory or git isolation anywhere in Codex's agent
> system, so two GREEN-style writers are two processes editing one checkout.
> The documentation is blunt about this and offers no mechanism for it: be
> more careful with parallel write-heavy workflows, because agents editing code
> at once can create conflicts and increase coordination overhead.
>
> In practice: WHITE and BLACK fan out as wide as the concurrency cap allows,
> because they only read. GREEN fans out only when the units are genuinely
> disjoint files that no other worker will touch — and if you cannot say which
> files each worker owns before you launch them, that is the answer: keep the
> writing in one agent.

**Depth:** two layers — the parent thread spawning hats, and hats spawning
their own workers — is what the method is designed around, and it is enough for
almost everything. Past that, the summarising loss at each hop destroys the
detail the fan-out was for.

> **Uncertain in Codex:** whether a subagent can itself spawn further
> subagents is not something this package has verified against the Codex
> documentation. If nested spawning is unavailable in your version, run the
> fan-out from the parent thread instead: launch the per-module or per-threat
> workers yourself, collect their reports, and hand the merged set to the hat
> that owns them. The method is unchanged; only who presses the button moves.

**Batch size:** keep concurrent agents in the low teens, and remember that
`agents.max_concurrent_threads_per_session` may cap you lower. Beyond that,
results arrive faster than they can be merged well, and merging badly is worse
than running fewer.

### Very wide surfaces — Tier 5

When the work is one mechanical operation repeated across dozens or hundreds
of items — audit every route, convert every file, check every record — running
one agent per item is the right tool, and it belongs to the main thread rather
than to any hat.

**Codex has no `Workflow` tool or equivalent**, so there is no built-in way to
script that. Two honest routes:

1. **Fan out from the parent thread.** Launch one subagent per unit in
   batches, respecting `agents.max_concurrent_threads_per_session` — going over
   it queues the extras rather than failing, so the sweep still finishes, just
   more slowly. Keep the per-unit prompt identical and the per-unit return
   short, or the results will not fit back together.

2. **Ask the user to run `codex exec` once per unit, outside the session.**
   Better when the surface is large or the units are separate directories,
   because each run gets its own fresh context instead of sharing one.
   `codex exec --cd <dir>` sets the working directory per run; `--json` gives
   a structured event stream, `-o` / `--output-last-message <file>` captures
   the final message to a file, and `--output-schema <file>` forces that final
   message into a JSON shape you define. Write the loop for them and say which
   files the results will land in.

Both routes inherit the warning above: a sweep that only reads is safe to run
wide, a sweep that writes is not, because all of it lands in one workspace.

Keep the hats for judging the *result* of the sweep: WHITE defines what to look
for, the sweep runs, BLACK and BLUE judge what came back against the bar. A
sweep is a data-gathering instrument, not a replacement for the team.

---

## 5. Stopping

### PASS
Every quality-bar item met with evidence. Report the result and what each hat
contributed that changed the outcome.

### REVISE
Work goes back to GREEN with ordered, specific instructions. Round counter
increments.

### ESCALATE — stop and ask the human

Escalate immediately, regardless of round count, when any of these is true:

- **The next action is irreversible** — deploying, deleting, publishing,
  sending, spending money, writing to production data, force-pushing.
- **The hats disagree on direction** and BLUE cannot pick without knowing
  something only the human knows (budget, deadline, risk appetite, who the
  audience is).
- **The quality bar itself looks wrong** — the work revealed that the stated
  goal was not the real goal.
- **WHITE's unknowns list contains something load-bearing** that cannot be
  resolved from available sources.

When escalating: state the question in one sentence, give the options with
their consequences, give BLUE's recommendation, and stop. Do not ask and keep
working.

**Codex note on unattended runs.** If Codex is running with
`approval_policy = "never"` there is no human there to answer an escalation.
An escalation in that mode means: stop the run, write the question and the
options into `99-result.md`, and leave the work in whatever safe state it is
in. Do not decide the escalated question yourself because nobody is available
to decide it — an unattended run that guesses on an irreversible action is the
worst outcome this method can produce.

### Budget exhausted

After round 3 without a pass, **report honestly**. Give the quality bar with
pass/fail per item, the specific blocker, what was tried, and what a fourth
round would attempt. Do not pass work that did not meet the bar, and do not
silently continue past the budget.

---

## 6. The run folder

Every run at Tier 2 or above leaves a folder behind. It makes the run
auditable, resumable, and hands off cleanly to another tool or another person.

```
.sixhat/<yyyy-mm-dd>-<short-slug>/
  00-goal.md          goal statement, quality bar, tier chosen and why
  01-white.md         facts, each with evidence; unknowns list
  02-green-options.md the 2–3 approaches
  03-decision.md      which option, BLUE's reason, dissent from other hats
  04-build-r1.md      what GREEN built, what it left out
  05-review-r1.md     BLACK / RED / YELLOW findings
  06-grade-r1.md      bar item by item, verdict
  ...                 (04–06 repeat per round)
  99-result.md        final state, what's done, what isn't, open risks
```

Keep entries short and factual. This is a log, not a report — the deliverable
is the deliverable. If the task is a one-off with no repository to put this in,
use a temporary directory and say where it went.

`99-result.md` is the file to hand to another agent or another tool. It should
be readable on its own by someone who saw none of the run.

### Codex note — the run folder is also the team's shared memory

In Claude Code the run folder is mostly an audit trail, because agents there
can share more context. In Codex it does real work: since subagents cannot see
each other, **the files in the run folder are how one hat's output reaches the
next hat.** Write each report to its file as soon as it comes back, and point
the next hat at the path.

### Optional state file for the Stop hook

If you installed the optional Stop hook, the run also keeps a small state file
at `.sixhat/active`. It is a single JSON object:

```json
{
  "run": ".sixhat/2026-09-21-auth-401",
  "round": 1,
  "max_rounds": 3,
  "status": "running"
}
```

- Write it when the run starts (`status: "running"`, `round: 1`).
- Bump `round` each time BLUE returns REVISE.
- Set `status` to `"pass"` when BLUE returns PASS, `"escalated"` on an
  escalation, or `"failed"` when the budget is spent without a pass.

The hook reads this file to decide whether to let the turn end. If you are not
using the hook, you do not need the file — but writing it costs nothing and it
doubles as a resume marker if a run is interrupted.

---

## 7. Where GREEN builds (Codex)

The Claude version of this file hands GREEN an isolated git worktree. **Codex
has no equivalent for subagents.** There is no `isolation`, `worktree`, `cwd`
or `working_directory` field in a Codex agent file or anywhere else in its
config system, so every hat in a run works in the parent's workspace on the
same checkout.

Codex worktrees do exist, but they are a **chat-level feature of the ChatGPT
desktop app**: the human selects "Worktree" under the composer when starting
the chat, the copy lives under `$CODEX_HOME/worktrees`, the most recent fifteen
are kept, and it is dedicated to that one chat. It cannot be assigned to a
subagent. If a run needs true isolation, that choice is made by the human
before the run starts — it is not something this method can arrange mid-flight.

So the method compensates rather than pretending:

- **Capture a patch before and after each build round.** GREEN writes
  `git diff > .sixhat/<run>/before.patch` before touching anything, and
  `git diff > .sixhat/<run>/round-N.patch` when it is done. `git apply -R` on
  that second file undoes the round. This is the least fragile option available
  and it is what Codex's own guidance recommends: prefer patch-based workflows
  such as `git diff` and `git apply` over editing tracked files directly, and
  commit often so you can roll back in small increments. A `git diff` into a
  file is a read of the git directory plus a write to an ordinary workspace
  file, so it stays clear of the protected-path question below.
- **Ask for a branch too, but do not build the plan on it.** Under
  `sandbox_mode = "workspace-write"` the writable set is the workspace plus
  `$TMPDIR` and `/tmp`, with `<workspace>/.git` carved back out as recursively
  read-only — whether it appears as a directory or a pointer file, and
  including the git directory a pointer file resolves to. `.agents` and
  `.codex` are protected the same way.

  > **Where the documentation is silent:** it states the protection but does
  > not say what happens when a write to a protected path is attempted —
  > whether the command fails outright or becomes an approval request. The
  > `.rules` system separately has an `allow` decision that runs a command
  > outside the sandbox without prompting, which is a documented route by
  > which a git command could bypass the sandbox entirely. This package
  > therefore does **not** claim that a Codex agent cannot commit. It says:
  > try it, report whether it worked, and keep the patch file as the thing
  > that is actually guaranteed.
- **`/tmp` and `$TMPDIR` are writable by default** (`writable_roots` defaults
  to empty, and neither `exclude_tmpdir_env_var` nor `exclude_slash_tmp` is on
  by default), so copying a file there before editing is a second fallback. It
  is weaker — outside version control, not durable — so it is for scratch work,
  not for the round's record.
- **One writer at a time.** All the hats share the workspace, and Codex warns
  that agents editing code at once create conflicts and add coordination
  overhead. GREEN builds; the reviewing hats read.
- **Nothing irreversible without a human.** Merging to a shared branch,
  pushing, deploying or publishing is an escalation, not a build step, whatever
  the sandbox would technically allow.
- **Outside a git repository** — documents, plans, prompts, analysis, creative
  work — GREEN writes directly, and copies the original beside it if it is
  overwriting something. Isolation buys nothing there, and `git diff` has
  nothing to diff.
