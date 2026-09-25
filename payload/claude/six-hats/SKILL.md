---
name: six-hats
description: 'Run a task through a six-agent team — White (facts), Green (options and build),
  Yellow (payoff), Black (risk and verification), Red (gut reaction), Blue (control) — iterating
  up to three rounds against a written quality bar. Use whenever a task is complex, high-stakes,
  contested, or expensive to get wrong: architecture and design decisions, features of real size,
  security-sensitive changes, migrations across many files, debugging something that resisted
  a first attempt, client deliverables, launch and pricing decisions, or any work others will
  see. Use it whenever the user says "do this properly", "think hard about this", "I need this
  to be right", "use the team", "six hats", or "review this thoroughly". Also use it when a previous
  attempt was rejected or came back wrong, since a second solo attempt usually repeats the first
  one''s blind spot. Do NOT use it for trivial, obvious, or trivially reversible tasks — it costs
  roughly six times the tokens.'
hooks:
  Stop:
  - hooks:
    - type: prompt
      timeout: 30
      prompt: "You are deciding whether a six-hats run is allowed to end. Judge only\nfrom what\
        \ is visible in this conversation — you cannot run commands or read\nfiles, so anything\
        \ not reported in the transcript does not exist for you.\n\nReturn {\"ok\": true} and\
        \ let the turn end if ANY of these holds:\n- No six-hats run is in progress.\n- The BLUE\
        \ hat recorded a PASS, having graded the written quality bar item by\n  item with evidence\
        \ for each item.\n- The run escalated to the user and is waiting on an answer.\n- Three\
        \ rounds finished without a pass and BLUE reported plainly which bar\n  items still fail.\n\
        - The user changed direction or called the run off.\n\nOtherwise return {\"ok\": false,\
        \ \"reason\": \"...\"} where the reason names the one\nconcrete next step — the stage\
        \ that has not run, the hat that has not reported,\nor the bar item that is still unmet.\
        \ Write the reason as an instruction, since\nit is fed back as the next turn's directive.\n\
        \nIf BLUE has graded but the pass is not backed by evidence for every bar item,\nthat\
        \ is not a pass; say which item lacks evidence.\n\nIf the quality bar turns out to be\
        \ unachievable, return {\"ok\": false,\n\"impossible\": true, \"reason\": \"...\"} so\
        \ the turn ends instead of looping.\n\nWhen the evidence is genuinely unclear, prefer\
        \ {\"ok\": true}. A run held open by\nmistake wastes turns and irritates the user, who\
        \ can always ask for another\nround; a run that ends early costs one sentence to restart."
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

## Step 3 — Run the round

Recon → Design → Build → Review → Grade. `references/orchestration.md` has the
full structure, what each hat receives, and why RED and BLACK must not see the
other hats' reasoning.

**Launch every agent in a stage in one batch so they run concurrently.** The
two parallel stages are YELLOW ∥ BLACK reviewing options, and BLACK ∥ RED ∥
YELLOW reviewing the build. Sequential launches here waste most of the benefit.

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

## Spawning the hats in Claude Code

Six agent definitions ship with this skill in `agents/`. Copy them to
`.claude/agents/` (project) or `~/.claude/agents/` (personal) and spawn by
name: `hat-white`, `hat-green`, `hat-yellow`, `hat-black`, `hat-red`,
`hat-blue`.

**If those agent definitions are not installed** — which is the normal case in
the Claude desktop and web apps, and in any session without a `.claude/agents/`
directory — spawn `general-purpose` agents instead and paste that hat's brief
from `references/hats.md` at the top of the prompt. The method is identical;
only the tool and model restrictions are lost. Do not skip the skill because
the agent files are missing, and do not stop to ask the user to install them.

### Briefing an agent

Every hat prompt carries four things:

1. **The hat's brief**, verbatim from `references/hats.md` — including its
   failure mode, which is the part that does the work.
2. **Only the inputs that hat should see** (the table in
   `orchestration.md` §3). WHITE gets the task alone. RED gets the
   deliverable alone.
3. **The output path** — `.sixhat/<run>/NN-<hat>.md` — so the run log builds
   itself.
4. **The required output shape.** BLACK returns findings as
   trigger → consequence → severity. RED returns a one-line verdict then at
   most three reactions. BLUE returns the bar item by item with evidence.

### Where GREEN builds

In a git repository, spawn `hat-green-worktree` instead of `hat-green`. Its
frontmatter carries `isolation: worktree`, so Claude Code gives that subagent
its own copy of the repository before it starts. A bad round cannot touch the
working tree, and the worktree is removed automatically if GREEN changes
nothing. BLACK tests inside that same worktree.

Outside a git repository — documents, plans, prompts, analysis, creative work
— spawn plain `hat-green`. Isolation buys nothing there.

**Do not have a hat call `EnterWorktree` itself.** That tool exists and
subagents can reach it, but it is meant to be used only when the user or the
project's own instructions ask for a worktree by name — a skill asking on
their behalf is not the same thing. It also cannot be combined with
`isolation: worktree`, and it is undocumented whether a subagent creating a
worktree by name moves only its own working directory or the whole session's.
With several hats running at once, guessing wrong there would move everyone.
The declarative field is the supported route; use it.

**The base branch is the one thing to check before starting.** A worktree
branches from the repository's default branch, not from the session's current
HEAD, so uncommitted or unmerged work is not in it. This is governed by the
`worktree.baseRef` setting: the default `fresh` branches from the remote
default branch, and `head` branches from the current local HEAD instead.

So when the task builds on work in progress, say so plainly and let the user
choose — either they set `worktree.baseRef` to `"head"` (it applies to every
worktree in that repo, not just this run), or GREEN builds in place this time.
Do not silently hand GREEN a worktree that is missing the work the task
depends on; the round will look fine and be built on the wrong base.

If one specific base branch is needed rather than a global setting, the
documented route is `git worktree add -b <branch> <base>` followed by
`EnterWorktree` with that `path`. `EnterWorktree` takes no base parameter.

**Nothing merges by itself.** Leaving a worktree does not commit, merge, or
hand back a branch — the work simply sits on the worktree's branch. GREEN
reports that branch name, and the merge is the user's call, always, for
anything irreversible.

## The run keeps itself going

This skill's frontmatter registers a `Stop` hook. Every time a turn ends, a
fast model reads the conversation and decides whether the run is finished. If
it is not, the turn does not end — the hook's reason becomes the next turn's
instruction and work continues. Nothing has to be typed, and no settings file
is involved.

**This only works if each round is reported in the conversation.** The hook's
evaluator runs no commands and reads no files, so anything written only to the
run folder is invisible to it. At minimum, surface BLUE's grade — the bar item
by item, each with its evidence — in the transcript at the end of every round.
A run that logs everything to disk and says nothing in the conversation will
be held open until the block cap forces it to stop, which wastes turns.

Three practical limits:

- A turn that ends while subagents are still running is skipped for
  evaluation. A wide fan-out round may not be judged until the round after it.
- Claude Code stops honouring the hook after eight consecutive blocks. A
  three-round budget sits well inside that, so hitting the cap means something
  is stuck rather than slow — report it rather than pushing further.
- The hook is suppressed entirely when `disableAllHooks` or
  `allowManagedHooksOnly` is set. The skill still works; it just stops
  self-continuing, and the run needs a nudge between rounds.

The hook stays registered for the rest of the session, which is why its
condition begins by checking whether a run is in progress at all. When no run
is active it lets every turn end untouched.

### `/goal` as the manual alternative

If the hook is unavailable, or the user wants a condition of their own rather
than BLUE's bar, `/goal` does the same job and is typed by the user. Hand over
the line rather than explaining the command:

```
/goal <bar restated as one checkable end state> or stop after 3 six-hats rounds
```

Do not set both at once. Two independent evaluators judging the same run
disagree eventually, and the run then stops on whichever is stricter for
reasons nobody can see.

## Tier 5 — when the surface is too wide for agents

Some tasks are one mechanical operation repeated across dozens or hundreds of
items: audit every route handler, convert every file, check every record. Six
agents cannot cover that, and fan-out at this size produces more results than
can be merged well.

If a `Workflow` tool is present in this session, use it — it runs a script that
spawns one agent per item, keeping the intermediate results out of the
conversation. Follow that tool's own description for how to call it; this skill
does not assume its parameters.

**Only the main thread can do this.** The `Workflow` tool is removed from every
subagent, so no hat can reach it. WHITE cannot fan out this way and neither can
BLACK — the sweep is launched before or between rounds, by the main thread, and
the hats judge what comes back.

If the tool is not available, write the workflow instead: author
`.claude/workflows/six-hats-<slug>.js` and tell the user to run
`/six-hats-<slug>`. Writing the file needs no special permission and the file
is reusable. Two constraints that will otherwise bite — the script cannot
import modules or touch the filesystem itself (only its agents can), and
`Date.now()`, `Math.random()` and a no-argument `new Date()` all throw, so any
timestamp or seed has to be passed in as an argument.

Either way the hats still own the judgement: WHITE defines what the sweep
should look for, the sweep runs, and BLACK and BLUE grade what came back
against the bar. A sweep is a data-gathering instrument, not a replacement for
the team.

## Handing off to Codex or another tool

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
