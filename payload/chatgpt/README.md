# Six Hats for ChatGPT (Plus / Pro)

A way to make ChatGPT work through a hard task properly instead of giving you
its first confident answer.

Six roles take turns on the same task. One gathers facts. One builds the
thing. One argues it is too complicated. One tries to break it. One reacts
like a normal human seeing it for the first time. One grades the result
against a standard that was written down before the work started.

It is based on Edward de Bono's Six Thinking Hats, with one change: here two
of the hats actually do work. GREEN builds the deliverable and BLACK checks
it. They do not only think about it.

---

## What is in this folder

| File | What it is | What you do with it |
|---|---|---|
| `project-instructions.md` | The main version. Full method, compressed. | Paste into a ChatGPT Project's instructions. |
| `six-hats-reference.md` | The full method with examples. | Upload as a file to the same Project. |
| `custom-instructions.md` | A shorter version. | Paste into Custom Instructions if you want it in every chat. |
| `README.md` | This file. | Read it once. |

You want either **the Project setup** (recommended) or **the Custom
Instructions setup**. You can do both.

---

## Setup A — the Project (recommended, takes 5 minutes)

This is the better version. The Project can hold an uploaded reference file,
so ChatGPT has the full method to consult, and the instructions only apply
inside that project instead of every chat you have.

**Step 1. Create the project.**
In the ChatGPT sidebar, click **Projects**, then **New project**. Name it
something like "Six Hats". Projects are available in the desktop app and on
the web.

**Step 2. Paste the instructions.**
Open the project. Click the **•••** menu, then **Project settings**, then
**Instructions**.

Open `project-instructions.md`. You will see two marker lines:

```
▼▼▼ PASTE BLOCK STARTS ON THE NEXT LINE ▼▼▼
▲▲▲ PASTE BLOCK ENDS ON THE LINE ABOVE ▲▲▲
```

Copy everything between them — not the markers, not the notes above or below
— and paste it into the instructions field. Save.

**Step 3. Upload the reference file.**
Still in the project, upload `six-hats-reference.md` as a project file. Files
uploaded to a project stay available to every chat inside it. On Plus you can
have up to 25 files in a project, so this uses one slot.

This file matters. The instructions field is small, so it carries the rules
but not the examples. The reference file carries the worked examples of what
a good finding looks like versus a bad one, and those examples are most of
what stops the review turning into vague praise.

**Step 4. Start a chat inside the project.** That is it.

---

## Setup B — Custom Instructions (if you want it everywhere)

Use this if you cannot predict which chat will need the team.

Go to **Settings → Personalization → Custom Instructions**. Open
`custom-instructions.md`, copy the text between the same two markers, and
paste it in.

Two things to know:

1. **It is shorter and weaker.** Custom Instructions cannot hold an uploaded
   file, so there is no reference for ChatGPT to consult. It will improvise
   the details it does not have.
2. **It only wakes up when you ask.** The text starts with an activation rule,
   because otherwise ChatGPT would start writing quality bars for "what should
   I have for lunch". It stays dormant until you use a trigger phrase.

The field holds 5,000 characters. This block uses about 4,360, leaving roughly
640 for anything else you want in there.

---

## How to start a run

Just describe your task and add a trigger phrase. Any of these work:

- "six hats"
- "use the team"
- "do this properly"
- "think hard about this"
- "I need this to be right"

**A real example of what to type:**

> Six hats on this. I need to decide whether to raise our starter price from
> $19 to $29. I have last quarter's churn numbers and the competitor pricing
> page. Tier 3 feels right but you decide.

**What should happen next.** ChatGPT should:

1. Say which tier it picked and why.
2. Write the goal and the quality bar **before** doing any work.
3. Run the hats one at a time, each under a clear heading.
4. Finish with BLUE grading each bar item pass or fail, then PASS, REVISE or
   ESCALATE.

**If it skips straight to answering**, say: "Pick a tier and write the quality
bar first." That is the step everything else depends on.

**If all six hats agree with each other**, that is a bad sign, not a good one.
Say: "That round had no disagreement. Re-run BLACK with the round-2 brief."

**If the run gets long and you lose the bar**, say: "Repost the goal and
quality bar before starting the next round." Or ask for a canvas called "Run
log" at the start and have ChatGPT keep it updated as it goes.

---

## What this version can and cannot do

Being honest about this matters, because the Claude Code and Codex versions of
this method are genuinely more capable and you should know where the gap is.

### What is the same

- The six roles and what each one is for.
- The tier system — you do not run six hats on a simple question.
- The quality bar written before the work, graded item by item afterwards.
- The rule that a round where everyone agrees is a failed round.
- The three-round budget and the rule against passing work just because the
  budget ran out.
- The escalation triggers — stop and ask before anything irreversible.

### What is different, and why

**No parallel workers.** In Claude Code and Codex, the hats are separate
agents that run at the same time. Here there is one model playing six roles in
sequence, in one conversation. Everything below follows from that.

**No real independence between hats.** In the agent versions, BLACK has
genuinely never seen GREEN's reasoning — it was never sent to it. Here BLACK
can see everything. The instructions push back on this hard (each hat is told
to treat earlier output as someone else's document, and RED is told explicitly
to ignore all reasoning above it), and it helps. But it is a discipline, not a
guarantee. **This is the real gap.** If you want maximum independence, run the
hats in separate chats and paste the outputs between them by hand — tedious,
but it restores the thing that was lost.

**No file output and no run folder.** The agent versions leave a `.sixhat/`
folder behind with one file per stage, which makes a run auditable and lets
you hand it to someone else. There is no filesystem here. The conversation is
the log. A canvas is the nearest substitute and is worth using for long runs.

**No fan-out at Tier 4.** In the agent versions, a wide problem gets split —
twelve subagents each reading five files. Here, one pass over a wide surface
will summarise rather than verify, which is exactly what WHITE is not allowed
to do. Work around it by splitting the surface yourself across several
messages: "WHITE, section 1 of 4", then 2, and so on.

**BLACK cannot actually run anything.** In Claude Code, BLACK executes the
test suite and pastes real exit codes. Here, BLACK verifies by recomputing
numbers, opening cited sources and tracing logic by reading. That is a real
check, and it catches a lot — but it is not the same as a passing build, and
you should not treat it as one.

### Where this version is genuinely fine

For work that is writing, analysis, strategy, planning, pricing, messaging,
proposals, research and decision-making, the gap is small. Those tasks do not
need a test runner or a worktree, and the sequential hats do most of what the
parallel ones do. For software work where "does it build and do the tests
pass" is the question, use Claude Code or Codex.

---

## One note on Skills

ChatGPT has a Skills feature (**Plugins → Skills**, invoked with `@skill`),
but as of today it is documented for Business, Enterprise, Healthcare and Edu
accounts only — not Plus or Pro — which is why this package uses Projects
instead. If your account ever does show a Skills tab, you can upload the
`SKILL.md` from the Codex version of this package there instead of using the
Project setup.

---

## Quick troubleshooting

| What you see | What to say |
|---|---|
| It answers immediately, no tier, no bar | "Pick a tier and write the quality bar first." |
| Every hat agrees | "No disagreement in that round. Re-run BLACK with the round-2 brief." |
| BLACK says "looks good" | "BLACK must give a finding with a trigger, a consequence and a severity, or list exactly what it checked." |
| RED writes three paragraphs | "RED is one verdict line and at most three reactions. Re-run it ignoring everything above." |
| YELLOW just praises the work | "That is a non-answer. Name a concrete cheaper path or say plainly there isn't one." |
| BLUE passes without quoting the bar | "Grade item by item. Quote each criterion, give pass or fail, and show the evidence." |
| GREEN gives one option and two obviously bad ones | "Those are strawmen. Give me a real second option that differs in mechanism." |
| The bar quietly changed | "Bar item 2 now reads differently from when you wrote it. Which is it, and why did it change?" |
