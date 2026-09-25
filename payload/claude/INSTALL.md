# Installing Six Hats for Claude

Two parts. The skill is required. The agent definitions are optional but worth
doing — without them the method still runs, it just loses the per-hat tool and
model restrictions.

---

## Part 1 — The skill (required)

Copy the `six-hats` folder into your skills directory.

**For all your projects:**

```bash
mkdir -p ~/.claude/skills
cp -r six-hats ~/.claude/skills/
```

**For one project only:**

```bash
mkdir -p /path/to/project/.claude/skills
cp -r six-hats /path/to/project/.claude/skills/
```

Then reload so Claude Code picks it up:

```
/reload-skills
```

Check it's there by typing `/` and looking for `six-hats` in the list.

---

## Part 2 — The agent definitions (recommended)

These give each hat its own tool set and model. WHITE runs on a cheaper model
because it's gathering evidence rather than judging. RED gets read-only access
so it can't wander off investigating instead of reacting. GREEN gets an
isolated worktree option so a bad round can't damage your working tree.

The files are inside the skill folder, in `six-hats/agents/`.

```bash
mkdir -p ~/.claude/agents
cp six-hats/agents/hat-*.md ~/.claude/agents/
```

Or for one project, copy them into `.claude/agents/` there instead.

Seven files land: the six hats plus `hat-green-worktree.md`, which is GREEN
again but running in a throwaway git copy. The skill picks between the two
depending on whether you're in a git repository.

**If you skip this part**, the skill spawns general-purpose agents and pastes
each hat's brief into the prompt instead. Same method, same results in most
cases. This is also what happens automatically in the Claude desktop and web
apps, where `.claude/agents/` doesn't exist — so you don't need to do anything
special there.

---

## Using it

```
/six-hats add rate limiting to the public API
```

Or just describe a hard task and it should trigger on its own. It's written to
fire on things like "do this properly", "I need this to be right", "think hard
about this", and on work that's complex or expensive to get wrong.

### What you should see

1. **A tier, stated in one line.** Tier 0 means it decided the task didn't need
   a team and is just doing it — that's correct behaviour, not a failure.
2. **A goal statement and a quality bar**, written before any work starts, in
   `.sixhat/<date>-<slug>/00-goal.md`.
3. **Agents running in parallel** during the review stages.
4. **A grade from BLUE** — the bar item by item, each marked met or not met with
   the evidence.
5. **PASS, REVISE or ESCALATE.**

### The run folder

Tier 2 and above leave a folder behind:

```
.sixhat/2026-09-21-rate-limiting/
  00-goal.md          goal, quality bar, tier and why
  01-white.md         facts with evidence, unknowns list
  02-green-options.md the approaches
  03-decision.md      which one, why, and who disagreed
  04-build-r1.md      what was built, what was left out
  05-review-r1.md     Black / Red / Yellow findings
  06-grade-r1.md      the bar, item by item
  99-result.md        final state, open risks
```

Add `.sixhat/` to your `.gitignore` if you don't want the logs committed.

`99-result.md` is written to be read cold by someone who saw none of the run.
That's the file to hand to Codex, or to a colleague, or back to Claude in a
fresh session.

---

## The run keeps itself going — nothing to type

The skill's frontmatter carries a `Stop` hook. When you invoke `/six-hats`,
that hook registers for the session. After every turn, a fast model reads the
conversation and decides whether the run is finished; if it isn't, the turn
doesn't end and work continues. You don't type anything.

**One thing you need to know**, because it decides whether this works: the
evaluator reads only what's been *said in the conversation*. It runs no
commands and opens no files. So if a run writes everything to `.sixhat/` and
says nothing in the chat, the hook can't tell that progress happened and will
hold the run open until it's forced to stop. The skill is written to report
Blue's grade in the conversation each round for exactly this reason. If you
edit the skill, keep that.

Three limits worth knowing:

- A turn that ends while agents are still running gets skipped for evaluation.
  A big fan-out round may not be graded until the round after it.
- Claude Code overrides the hook after eight consecutive blocks. A three-round
  budget is well inside that, so hitting the cap means something is stuck.
  `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` raises it if you ever need more.
- If `disableAllHooks` or `allowManagedHooksOnly` is set in your settings or by
  an admin policy, the hook won't run at all. The skill still works — it just
  won't self-continue, and you nudge it between rounds.

The hook stays registered for the rest of the session. Its condition starts by
checking whether a run is in progress, so once the run is done it lets every
turn end normally. `/clear` removes it along with everything else.

### If you prefer to drive it yourself

`/goal` does the same job with a condition you write:

```
/goal every route under /api rejects unauthenticated requests with 401 and the
test suite passes, or stop after 3 six-hats rounds
```

Don't run both at once. Two evaluators judging the same run will eventually
disagree, and the run then stops on whichever is stricter, for reasons you
can't see. `/goal clear` stops it.

## The hats check their own work

White, Black and Blue each carry a `Stop` hook in their agent file. In a
subagent that becomes a `SubagentStop`, so the hat can be prevented from
finishing until its report is actually usable:

- **White** can't finish on a vague tour of the codebase — every claim needs
  evidence attached and an Unknowns list at the end.
- **Black** can't finish on "looks good" — it needs a real command with a real
  result, plus either a concrete finding or an explicit list of what it checked
  and found clean.
- **Blue** can't finish on an impression — the bar has to be graded item by
  item, with evidence, before a PASS counts.

This is why the agent files are worth installing. Without them the same rules
are only *requested* in the prompt; with them, they're enforced.

One catch: for agent files inside a *project* (`.claude/agents/`), frontmatter
hooks are skipped until you've accepted the workspace-trust dialog for that
exact folder — trusting a parent folder isn't enough, and `-p` sessions never
count as trusted. Files in `~/.claude/agents/` are exempt, which is the main
reason the install steps above put them there.

---

## One setting worth knowing about: `worktree.baseRef`

When the task is code in a git repo, Green runs in its own worktree — an
isolated copy — so a bad round can't touch your working tree.

**By default that copy branches from your repository's default branch, not
from where you are now.** If you're mid-feature with uncommitted or unpushed
work, Green won't see it, and the round gets built on the wrong base while
looking perfectly fine.

Two ways to handle it:

```json
{ "worktree": { "baseRef": "head" } }
```

Put that in your settings and every new worktree branches from your current
local HEAD instead — your in-progress work comes along. This is the right
setting for most people who work on feature branches. Note it applies to every
worktree in that repo, not just six-hats runs.

Or leave the default and let the skill build in place when a task depends on
work in progress. It's written to notice this and tell you rather than pick
for you.

**Nothing merges automatically.** When Green finishes, the work sits on the
worktree's branch. Green reports the branch name; merging is yours to do. That
is deliberate — it's the last point where a bad round is free to throw away.

## Tuning it

**Round budget.** Default is 3. Say "use a budget of 5" when starting a run, or
edit the default in `SKILL.md`.

**Hat behaviour.** `six-hats/references/hats.md` is the source of truth for all
three packages — Claude, Codex and ChatGPT. Edit it there first, then copy the
change into the Codex and ChatGPT copies so they don't drift.

**Models per hat.** Edit the `model:` line in each `hat-*.md`. Valid values are
`sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit` to use
whatever the main conversation is on.

**Too eager?** If it spins up a team for small tasks, the tier logic in Step 1
of `SKILL.md` is what to tighten. Tier 0 exists precisely so it doesn't do
this.

---

## Uninstall

```bash
rm -rf ~/.claude/skills/six-hats
rm -f ~/.claude/agents/hat-*.md
```

Then `/reload-skills`.
