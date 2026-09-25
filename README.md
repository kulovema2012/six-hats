# Six Hats — a task-execution team for Claude, Codex and ChatGPT

One method, packaged three times, because the three tools have genuinely
different machinery underneath.

Six agents with conflicting jobs take a task through recon, design, build and
review, then iterate against a quality bar that was written down *before* the
work started. Up to three rounds, then an honest report either way.

| Hat | Job |
|---|---|
| **WHITE** | Facts. Reads the real code, data and docs. Evidence for every claim. |
| **GREEN** | Options, then implementation. The only hat that writes the deliverable. |
| **YELLOW** | Payoff and the simplest path. The counterweight to Black. |
| **BLACK** | Risk, red team, and verification. Actually runs the tests. |
| **RED** | Gut reaction. First ten seconds, no analysis. |
| **BLUE** | Control. Owns the goal, the quality bar, the grade, the done-call. |

This is De Bono's Six Thinking Hats adapted for execution rather than
discussion. The one deliberate change: De Bono's hats only think. These ones
build and verify.

---

## What's in the box

```
payload/claude/     Claude Code, Claude desktop, Claude web
payload/codex/      Codex CLI, Codex IDE extension, Codex desktop
payload/chatgpt/    ChatGPT Plus / Pro
payload/six-hats.skill   the Claude skill as one upload, for claude.ai and the desktop app
```

Each folder has its own install instructions. For Claude Code and Codex the
installer below does all of it in one line.

| | `claude/` | `codex/` | `chatgpt/` |
|---|---|---|---|
| Six agents run in parallel | yes | yes | no — sequential passes |
| Hats can fan out to their own subagents | yes | probably, unconfirmed | no |
| Auto-continue until the bar is met | automatic, from the skill itself | Stop hook you install | no |
| Hats blocked from finishing a weak report | White, Black and Blue | Black | no |
| Very wide surfaces (Tier 5) | workflow tool, or a workflow file it writes | subagent fan-out or `codex exec` | no |
| Green builds in an isolated copy | yes, git worktree | no — patches instead (worktrees exist, but per chat, not per agent) | no |
| Run folder written to disk | yes | yes | no — the chat is the log |
| Black can actually run the tests | yes | yes | no |
| Per-hat sandbox and reasoning effort | yes | yes, set in each agent file | no |

The Claude version needs no setup for the auto-continue loop — the skill
registers its own Stop hook when invoked, so a run keeps going until Blue
passes it or the budget is spent. Codex reaches the same behaviour through a
hook file you install once.

**Claude Code and Codex are the full-strength versions.** ChatGPT Plus/Pro has
no parallel workers of any kind, so that version runs the six hats as
sequential passes by one model, with specific techniques to stop them
collapsing into a single agreeable voice. It's a real method, not a stub, but
use it for thinking work rather than anything where "do the tests pass" is the
actual question.

---

## Install

**Claude Code and Codex, one line:**

```
npx -y six-hats
```

That puts the Claude skill in `~/.claude/skills/six-hats`, the seven Claude hat
agents in `~/.claude/agents/`, the Codex skill in `~/.agents/skills/six-hats`
and the six Codex hat agents in `~/.codex/agents/`. Then run `/reload-skills`
in Claude Code and start a new Codex session:

```
/six-hats <your task>        Claude Code
$six-hats <your task>        Codex
```

The two tools each get their own copy of the skill because the two versions are
written for different machinery. Each copy sits where only its own tool looks,
so neither tool ever loads the other's.

| Flag | What it does |
|---|---|
| `--scope user` | default: every project, from your home directory |
| `--scope project` | one repository only; `--project DIR` picks it, default is the current directory |
| `--only claude` / `--only codex` | install for one tool |
| `--no-agents` | skip the hat agent files; the skill then briefs general agents itself |
| `--codex-hooks` | also install the optional Codex Stop and BLACK-report hooks. Project scope only, because the hooks call their scripts by a path relative to the repository. Needs `sh` and `jq`. |
| `--dry-run` | show what would change |

`npx -y six-hats verify` checks the install, and `npx -y six-hats uninstall`
removes it (pass the same `--scope` you installed with). Anything the installer
overwrites is copied to `~/.six-hats-backups/<timestamp>/` first, and running
install again only changes what differs.

**By hand** — the full manual steps are in `payload/claude/INSTALL.md` and
`payload/codex/INSTALL.md`.

**ChatGPT** — create a project called Six Hats, paste
`payload/chatgpt/project-instructions.md` into its instructions, upload
`payload/chatgpt/six-hats-reference.md` as a project file. Full steps in
`payload/chatgpt/README.md`.

**claude.ai and the Claude desktop app** — upload `payload/six-hats.skill` as a
custom skill. That copy has no Stop hook, because the upload
format does not accept one; use `/goal` there instead, as the skill explains.

---

## The three rules that make it work

Everything else in these files is machinery in service of these.

**1. The bar is written before the work, and graded honestly.** BLUE writes 3–6
criteria that a person could mark met or not met without arguing. It happens
before anything is built, so it can't be quietly bent later to fit whatever got
made. After three rounds without a pass, BLUE reports that plainly. A false
pass is worse than an honest incomplete.

**2. The hats must disagree.** A round where all six approve is a failed round,
not a successful one — it means they collapsed into one voice and you paid six
times the tokens for one model's opinion. If a round produces no disagreement,
that gets noted and the pass is treated with suspicion.

**3. Findings have to be actionable.** "Consider adding error handling" is not a
finding and gets sent back. "`sync.ts:42` — a 429 response retries forever with
no backoff or cap, so a rate-limited account hangs the worker permanently —
HIGH" is a finding.

---

## When not to use it

Six agents cost roughly six times the tokens and add a round-trip of latency.
That price is worth paying when a wrong answer is expensive or the problem has
several defensible approaches. It is not worth paying to fix a typo.

Every version starts by picking a tier, and **Tier 0 is "no team, just do the
task."** That tier existing is what keeps the skill from being ceremony. If you
find it spinning up six agents for something small, that's the bug — tell it to
work at a lower tier.

---

## Changing how a hat behaves

`payload/claude/six-hats/references/hats.md` is the source of truth for all three
packages. The Codex copy is byte-identical; the ChatGPT reference file carries
the same briefs with sequential-mode notes added.

Change that file first, then push the change out to the Codex copy and the
ChatGPT reference so the three versions don't drift apart.

---

## License

MIT. The method is adapted from Edward de Bono's Six Thinking Hats; this
package is not affiliated with or endorsed by the de Bono Group.
