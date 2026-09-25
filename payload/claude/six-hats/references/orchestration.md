# Orchestration mechanics

How the team is actually assembled and run. Read `hats.md` for what each hat
does; this file covers how many of them to use, in what order, with what
parallelism, and when to stop.

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
every route handler, convert every file, check every record. Too wide for
agents to cover by hand, and too wide for fan-out — past a dozen or so
concurrent agents, results arrive faster than they can be merged well, and
merging badly is worse than running fewer.

The sweep belongs to the main thread, not to a hat. See §4, "Very wide
surfaces". The hats keep the judgement: WHITE defines what the sweep should
look for, the sweep runs, BLACK and BLUE grade what comes back against the
bar. A sweep is an instrument for gathering facts, not a replacement for the
team.

**When in doubt, pick one tier lower and escalate.** Escalating costs one extra
round. Starting too high costs the whole budget.

---

## 2. The round

A round has four stages. Stages 2 and 4 are where the parallelism lives —
launch every agent in a stage in a single batch so they run concurrently.

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

**Depth:** subagents may spawn subagents, but three layers is the practical
ceiling and two is usually right. Past that, the summarising loss at each hop
destroys the detail the fan-out was for.

**Batch size:** keep concurrent agents in the low teens. Beyond that, results
arrive faster than they can be merged well, and merging badly is worse than
running fewer.

### Very wide surfaces — Tier 5

When the work is one mechanical operation repeated across dozens or hundreds
of items, a scripted orchestration that runs one agent per item is the right
tool, and **it belongs to the main thread.**

That last point is a hard constraint, not a preference: the `Workflow` tool is
removed from every subagent. No hat can launch a sweep. WHITE cannot fan out
this way and neither can BLACK. The sweep runs before or between rounds,
launched by the main thread, and the hats judge what comes back.

If a `Workflow` tool is present in the session, use it, following its own
description — this file does not assume its parameters. If it is not, write
the script instead: author `.claude/workflows/six-hats-<slug>.js` and tell the
user to run `/six-hats-<slug>`. Writing the file needs no special permission,
and the file is reusable next time.

Two constraints on such a script that will otherwise waste a run: it cannot
import modules or touch the filesystem itself — only the agents it spawns can
— and `Date.now()`, `Math.random()` and a no-argument `new Date()` all throw,
so any timestamp or seed has to arrive as an argument. Both exist so a stopped
run can be replayed and produce the same agent calls.

Keep the hats for judging the *result*: WHITE defines what to look for, the
sweep runs, BLACK and BLUE judge what came back against the bar.

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
