# Installing six-hats for Codex

Six agents with conflicting jobs work a task through recon, design, build and
review, grading themselves against a quality bar that was written down before
the work started.

This file tells you exactly which file goes where. It takes about five minutes.

There are three parts, and you can stop after any of them:

1. **The skill** — required. This is the method.
2. **The six agents** — strongly recommended. Without them the skill still
   works, but you have to paste each role brief in by hand.
3. **The hooks** — optional. One saves you typing "continue" between rounds.
   The other catches the BLACK hat finishing without having reported anything.

---

## What is in this package

```
codex/
  .agents/skills/six-hats/
    SKILL.md                  the method
    references/hats.md        what each of the six hats does
    references/orchestration.md   how a run is structured
  .codex/agents/
    hat-white.toml
    hat-green.toml
    hat-yellow.toml
    hat-black.toml
    hat-red.toml
    hat-blue.toml
  .codex/hooks.json           optional hook wiring (Stop + SubagentStop)
  .codex/hooks/six-hats-stop.sh            optional Stop hook script
  .codex/hooks/six-hats-black-findings.sh  optional SubagentStop hook script
  .codex/config.toml.example  example settings to MERGE, never to copy over
  INSTALL.md                  this file
```

---

## Part 1 — Install the skill (required)

### Decide: just this project, or everywhere?

**Just this project** — put it in the project folder. Other people working in
the same repository get it too, which is usually what you want for a team.

**Everywhere** — put it in your home folder. It follows you into every project.

### Copy the folder

For one project, run this from the top of your project:

```sh
mkdir -p .agents/skills
cp -R /path/to/codex/.agents/skills/six-hats .agents/skills/
```

For everywhere:

```sh
mkdir -p ~/.agents/skills
cp -R /path/to/codex/.agents/skills/six-hats ~/.agents/skills/
```

### About that folder name

It is `.agents/skills`, not `.codex/skills`. The name has no vendor in it on
purpose — it is a shared location that more than one tool reads. Getting this
wrong is the single most common installation mistake, so it is worth a second
look before you move on.

Codex looks for skills in this order, and the first match wins:

1. `.agents/skills` in your current folder
2. `.agents/skills` one folder up
3. `.agents/skills` at the root of the git repository
4. `~/.agents/skills` in your home folder

So a project copy overrides your personal copy. That is useful if you want to
customise the hats for one repository.

### Check it worked

Start Codex in the project and type:

```
$six-hats
```

The skill should come up. If it does not, you are probably in a folder that is
not under the one you installed into, or the path is `.codex/skills` instead of
`.agents/skills`.

---

## Part 2 — Install the six agents (recommended)

Each hat is one TOML file. Copy all six.

For one project, from the top of your project:

```sh
mkdir -p .codex/agents
cp /path/to/codex/.codex/agents/hat-*.toml .codex/agents/
```

For everywhere:

```sh
mkdir -p ~/.codex/agents
cp /path/to/codex/.codex/agents/hat-*.toml ~/.codex/agents/
```

That is the whole installation. There is nothing to register and nothing to
restart.

### Check it worked

Ask Codex to run one of them on its own, for example:

```
Use the hat-white agent to tell me what test framework this project uses,
with evidence.
```

You should get back a short list of facts with file paths attached, and an
"Unknowns" section at the end. If it comes back with opinions or suggestions
instead, the agent file was not picked up and you are talking to a plain
subagent.

### If you skip this part

The skill still works. It will spawn ordinary subagents and paste each hat's
brief from `references/hats.md` into the prompt. You lose nothing about the
method — only the convenience of naming the hat.

### Note on settings — what these six files now set for themselves

A subagent inherits the parent session's model, reasoning effort, sandbox
policy, permission mode, MCP servers and skills configuration **unless its own
file overrides it.** A custom agent file is allowed to carry the same keys as a
normal Codex session config; the documentation names `model`,
`model_reasoning_effort`, `sandbox_mode`, `mcp_servers` and `skills.config` as
examples. A value in the agent file beats the `[agents]` defaults in your
`config.toml`, which beat the parent session's value.

These six files use two of those keys:

| Hat | `sandbox_mode` | `model_reasoning_effort` | Why |
|---|---|---|---|
| WHITE | `read-only` | `high` | Only gathers evidence. Recon has to be deep. |
| YELLOW | `read-only` | `medium` | Reviews for value and simplicity; never edits. |
| RED | `read-only` | `low` | Reacts. More thinking time turns it into a second BLACK. |
| BLACK | `workspace-write` | `high` | Has to actually run the tests, and test runners write. |
| GREEN | `workspace-write` | `high` | Builds the deliverable and writes its own patches. |
| BLUE | `workspace-write` | `high` | Writes the bar and the grade into the run folder. |

`model` is deliberately left unset in all six, so every hat runs on the parent
session's model. The hats are supposed to argue as equals, and a cheaper model
on one of them weakens one voice without anyone seeing it happen.

Only `low`, `medium`, `high` and `xhigh` are used for reasoning effort. Codex's
config reference and its subagents page publish different lists of accepted
values for that key, and those four appear on both lists, so they are the ones
that are safe whichever page is current for your build.

**The sandbox setting is a default, not a guarantee.** Codex reapplies the
parent turn's live runtime overrides when it spawns a child — including sandbox
and approval choices you made during the session, such as a `/permissions`
change or having started with `--yolo`. Those win over the agent file. If you
are running the session wide open, the read-only hats are not read-only.

If you would rather they did not set anything, delete those key lines from the
TOML files; the hats then inherit everything, exactly as before.

---

## Part 3 — Install the Stop hook (optional)

There are two optional hooks in this package. This part covers the Stop hook,
which keeps a long run going. Part 3b covers a second, smaller one that watches
the BLACK hat. They are independent — install either, both, or neither.

### What it is for

A big six-hats run takes more than one turn. Normally you would type "continue"
between rounds. This hook does that for you: when Codex tries to end a turn, the
hook checks whether the run is finished and, if it is not, asks Codex to keep
going.

**The skill works fine without it.** If you are unsure, skip this part. You can
add it later.

### Copy two files

```sh
mkdir -p .codex/hooks
cp /path/to/codex/.codex/hooks/six-hats-stop.sh .codex/hooks/
chmod +x .codex/hooks/six-hats-stop.sh
```

Then the wiring. If you do **not** already have a `.codex/hooks.json`, copy
ours:

```sh
cp /path/to/codex/.codex/hooks.json .codex/
```

If you **do** already have one, do not overwrite it. Open it and add our entry
to the `Stop` list. Ours looks like this:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "sh .codex/hooks/six-hats-stop.sh",
            "timeout": 15,
            "statusMessage": "six-hats: checking whether the run is finished"
          }
        ]
      }
    ]
  }
}
```

A personal installation works the same way with `~/.codex/hooks.json` and
`~/.codex/hooks/six-hats-stop.sh`. If you install it personally, change the
command to the full path, because a relative path is resolved against wherever
the session is running:

```json
"command": "sh /Users/you/.codex/hooks/six-hats-stop.sh"
```

### It needs jq

The script uses `jq` to read JSON. If `jq` is not installed the hook does
nothing at all and quietly gets out of the way — it will not break your session,
it just will not continue runs for you.

```sh
jq --version    # if this errors, install jq or skip Part 3
```

### How it decides

The hook cannot read your conversation. The run leaves it a note instead, at
`.sixhat/active` in the project:

```json
{
  "run": ".sixhat/2026-09-21-auth-401",
  "round": 1,
  "max_rounds": 3,
  "status": "running"
}
```

The skill writes and updates this file as the run progresses. The hook blocks
the stop only while `status` is `"running"` and `round` is below `max_rounds`.
It allows the turn to end — and deletes the file — as soon as any of these is
true:

- BLUE recorded a PASS (`status` becomes `"pass"`)
- the run escalated to a human (`"escalated"`)
- the budget was spent without a pass (`"failed"`)
- `round` reached `max_rounds`
- the file is missing, unreadable, or stopped making progress

The hook also accepts a `verdict` field holding `PASS`, `ESCALATE` or `FAILED`
and treats it exactly like the matching `status`. That is deliberate belt and
braces: "verdict" is the word BLUE uses everywhere else in the method, so a
model will sometimes write the verdict and leave `status` alone. Honouring
either key costs nothing and avoids the worst thing this hook could do, which
is hold a finished run open for extra rounds because the wrong key was
written.

There is also a hard ceiling of two continuations per round, counted by the
hook itself. It cannot loop forever even if the state file is wrong.

### Check it worked

Make a fake state file in your project and end a turn:

```sh
mkdir -p .sixhat
echo '{"run":".sixhat/test","round":1,"max_rounds":3,"status":"running"}' > .sixhat/active
```

Start Codex, say "hello", and let the turn finish. Codex should keep going
instead of stopping, and mention a six-hats run in progress. Then clean up:

```sh
rm -rf .sixhat
```

You can also test the script directly, without Codex:

```sh
printf '{"cwd":"%s","hook_event_name":"Stop","stop_hook_active":false}' "$PWD" \
  | sh .codex/hooks/six-hats-stop.sh
```

With the fake state file in place this prints a JSON object containing
`"decision": "block"`. With no state file it prints nothing. Both are correct.

### If it will not stop

Delete the state file. That is the off switch:

```sh
rm -f .sixhat/active
```

---

## Part 3b — The BLACK findings hook (optional)

### What it is for

The BLACK hat has one rule it must not break: produce at least one finding, or
say explicitly what was checked and found clean. A BLACK report that says
"looks good" has failed — but it fails quietly, because it reads like success.
That is the one thing worth having a machine watch for.

This hook reads BLACK's last message as the subagent finishes. If there is
neither a finding nor a list of what was checked, it sends BLACK back for one
more pass. Once only.

### Why this one can target a single hat

Codex's `Stop` event ignores matchers, but `SubagentStop` does not: the
documentation says the matcher is applied to `agent_type` — the subagent type
or profile — for that event. So a hook can be pointed at one hat instead of
every subagent in the run. That is what makes this practical; without it, the
hook would fire on all six and would have to guess which one it was looking at.

`decision: "block"` on this event means "ask Codex to continue the subagent
flow". It does not throw BLACK's answer away and it is not a rejection.

**One assumption, stated plainly:** the documentation says matcher values
"depend on the subagent that stops" and does not state anywhere that the value
equals the `name` in a custom agent file. This package assumes it does, and
matches on `hat-black`. The script checks `agent_type` for itself as well, so
if that assumption is wrong the hook simply never fires — it will not misfire
on a different hat. If you install it and BLACK is never sent back even when it
returns nothing, that assumption is the first thing to suspect.

### Copy the script

```sh
mkdir -p .codex/hooks
cp /path/to/codex/.codex/hooks/six-hats-black-findings.sh .codex/hooks/
chmod +x .codex/hooks/six-hats-black-findings.sh
```

If you copied our whole `hooks.json` in Part 3, the wiring is already there. If
you are merging into your own, add this alongside your `Stop` entry:

```json
"SubagentStop": [
  {
    "matcher": "hat-black",
    "hooks": [
      {
        "type": "command",
        "command": "sh .codex/hooks/six-hats-black-findings.sh",
        "timeout": 15,
        "statusMessage": "six-hats: checking that BLACK reported something"
      }
    ]
  }
]
```

It needs `jq`, the same as the Stop hook, and like the Stop hook it does
nothing at all if `jq` is missing.

### Check it worked

You can test the script directly without Codex. This first call should print
nothing, because the report contains a real finding:

```sh
printf '%s' '{"hook_event_name":"SubagentStop","agent_type":"hat-black","stop_hook_active":false,"last_assistant_message":"## Findings\n- [HIGH] a.ts:1 - bad input -> crash\n"}' \
  | sh .codex/hooks/six-hats-black-findings.sh
```

This one should print a JSON object containing `"decision": "block"`, because
the report says nothing:

```sh
printf '%s' '{"hook_event_name":"SubagentStop","agent_type":"hat-black","stop_hook_active":false,"last_assistant_message":"Looks good, no issues."}' \
  | sh .codex/hooks/six-hats-black-findings.sh
```

### If you do not want it

Skip it. Nothing else in the package depends on it, and BLACK's own brief
already carries the rule — the hook only enforces what the brief already says.

---

## Part 4 — Settings (optional)

`.codex/config.toml.example` is a commented example. **Do not copy it over your
own config.** Codex reads a single `~/.codex/config.toml`, and replacing that
file loses everything else in it.

Open the example, read the comments, and paste the individual lines you want
into your existing config.

One trap when you paste: in TOML, a key belongs to whatever `[section]` header
appears above it. `approval_policy` and `sandbox_mode` are top-level settings,
so they must go above your first `[section]` header. Drop them under `[agents]`
by accident and they turn into `agents.approval_policy`, which is not a real
setting and is silently ignored. The example file is laid out in the correct
order for this reason.

The two things most worth looking at:

- `[agents] max_concurrent_threads_per_session` — how many hats may run at
  once. The method runs up to three in parallel.
- `approval_policy` and `sandbox_mode` — for a run you are not watching,
  `approval_policy = "never"` with `sandbox_mode = "workspace-write"` lets the
  team work without stopping, while keeping it inside the project folder.

One warning about that combination: with `approval_policy = "never"` there is
nobody to answer an escalation. The skill handles this by stopping the run and
writing the question into the run log rather than guessing, but it means you
should read `99-result.md` afterwards rather than assuming silence was success.

Do not use `--full-auto`. It is deprecated and prints a warning.

---

## About isolation: the one real difference from Claude Code

This is worth two minutes before your first run, because it is the place where
the Codex package and the Claude Code package genuinely differ.

**In Claude Code**, the GREEN hat can be handed its own git worktree — a
separate copy of the repository — automatically, per agent. A bad round happens
over there and the working tree you are sitting in is untouched.

**In Codex there is no equivalent for subagents.** No `isolation`, `worktree`,
`cwd` or `working_directory` setting exists in the agent file or anywhere in
the config system. Every subagent of a session works in the parent's workspace,
on the same checkout. If GREEN makes a mess, it makes it in your working tree.

Codex does have worktrees — but they belong to a **chat**, not to an agent. In
the ChatGPT desktop app you select "Worktree" under the composer when you start
the chat; the copy is kept under `$CODEX_HOME/worktrees`, the most recent
fifteen are retained, and it is dedicated to that one chat. Nothing can hand it
to a subagent afterwards.

**So if you want true isolation for a six-hats run in Codex, that is the
answer: start the chat with "Worktree" selected.** It is a choice you make
before the run, not something the skill can arrange for you.

**What the package does instead**, when you have not done that: GREEN captures
patches. Before it changes anything it writes `git diff` to
`.sixhat/<run>/before.patch`, and when it is done it writes its own diff to
`.sixhat/<run>/round-N.patch`. Any round can then be undone with
`git apply -R .sixhat/<run>/round-N.patch`. It is not isolation, but it is a
way back, and it is the approach Codex's own guidance recommends — prefer
patch-based workflows over editing tracked files directly, and commit in small
increments.

GREEN is also asked to create a branch and commit where it can. Whether that
works depends on your environment: under `workspace-write`, Codex protects
`<workspace>/.git` as read-only, recursively, and the documentation does not
say what happens when something tries to write there anyway. So the package
treats committing as a bonus and the patch file as the guarantee, and asks
GREEN to report which of the two it actually got.

One more consequence of the shared workspace: **do not run several writing
agents at once.** Codex warns that parallel write-heavy agents create conflicts
and coordination overhead, and provides nothing to prevent it. Reading hats can
fan out as wide as you like.

---

## Trying it for real

In a project with the skill installed:

```
$six-hats Add rate limiting to the public API endpoints.
```

What should happen:

1. Codex states a tier — probably Tier 2 or 3 — and says why.
2. It writes `.sixhat/<date>-<slug>/00-goal.md` with a goal statement and 3 to 6
   quality-bar criteria, before doing any work.
3. WHITE reports facts with file paths.
4. GREEN proposes two or three genuinely different approaches, one of which is
   the smallest possible change.
5. YELLOW and BLACK review those options at the same time.
6. BLUE picks one and says why.
7. GREEN builds it. BLACK runs the tests and pastes real exit codes.
8. BLUE grades the work item by item against the bar it wrote at step 2.

If step 2 does not happen — if it starts building before writing the bar down —
the run has already lost its main safeguard. Stop it and say so.

For something small and obvious, the correct behaviour is for Codex to just do
the task and not assemble a team at all. That is Tier 0, and it is a feature.

---

## Uninstalling

```sh
rm -rf .agents/skills/six-hats
rm -f .codex/agents/hat-*.toml
rm -f .codex/hooks/six-hats-stop.sh
rm -f .codex/hooks/six-hats-black-findings.sh
rm -rf .sixhat
```

Then remove the `Stop` and `SubagentStop` entries from `.codex/hooks.json`, and
any lines you merged into your `config.toml`.
