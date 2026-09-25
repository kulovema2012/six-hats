# Six Hats — full method reference (sequential / ChatGPT version)

**Upload this file to your ChatGPT Project as a project file.** The project
instructions field is small and has to stay compressed. This file is where the
detail lives: the complete role briefs, what each role should and should not
be shown, and worked examples of what good output actually looks like.

If you are ChatGPT reading this: consult this file whenever the project
instructions are thin on a point, and especially before writing BLACK's
findings or BLUE's grade. Do not invent a different version of the method.

---

## 1. What this is

A task-execution team. Six roles with genuinely conflicting jobs take a task
through recon, design, build and review, iterating against a quality bar that
was written down before the work started.

Adapted from Edward de Bono's Six Thinking Hats, with one deliberate change.
De Bono's hats only think — they are discussion roles for a room of people
taking turns. Adapted for execution the shape changes: one hat has to actually
build the thing, and one has to actually check it. **GREEN builds the
deliverable. BLACK verifies it.** That is the departure from the original
framework, and it is on purpose.

| Hat | Job |
|---|---|
| **WHITE** | Facts. Reads the real material. Evidence for every claim. |
| **GREEN** | Options, then implementation. The only hat that writes the deliverable. |
| **YELLOW** | Payoff and the simplest path. The counterweight to Black. |
| **BLACK** | Risk, red team, and verification. Actually checks the thing. |
| **RED** | Gut reaction. First ten seconds, no analysis. |
| **BLUE** | Control. Owns the goal, the quality bar, the grade, the done-call. |

---

## 2. Why each hat exists

A single model working alone on a hard problem has a characteristic failure:
it commits to the first plausible approach, builds it competently, and then
reviews its own work using the same assumptions that produced it. It cannot
find the flaw, because the flaw is upstream of everything it is looking at.

The six hats exist to break that loop by forcing perspectives that genuinely
conflict.

- WHITE refuses to speculate, so GREEN cannot build on invented facts.
- BLACK is rewarded for finding what is wrong, so it does not congratulate the
  work.
- YELLOW pushes back on BLACK's caution, so the result does not collapse into
  defensive over-engineering.
- RED is allowed to react without justifying itself, so an unjustifiable but
  real problem still gets said out loud.

**A round where every hat agrees is a failed round, not a successful one.**
It means the hats collapsed into one voice. When that happens the tension is
gone and the whole exercise is theatre. If a round produces no disagreement,
say so plainly and treat the result with suspicion.

---

## 3. The sequential problem, and what to do about it

In the Claude Code and Codex versions, each hat is a separate agent with its
own context window. Independence is structural: BLACK genuinely has not seen
GREEN's reasoning, because it was never sent to BLACK.

In ChatGPT Plus and Pro there are no subagents and no parallel workers
available from a conversation. All six hats are played by one model, in one
thread, in sequence. Every hat can see everything above it. That removes the
structural independence and creates one specific failure mode:

> The hats agree with each other, because they are the same voice, and the
> run produces a confident consensus that never tested anything.

You cannot restore true independence here. You can only manufacture a working
substitute. These five techniques are the substitute, and they are the reason
this version is not simply a degraded copy.

### 3.1 One hat finishes completely before the next begins

Never interleave. Never write a combined "here's what the team thinks"
summary. Each hat gets its own heading and its own finished output. Partial
outputs let the model blend voices; finished ones force it to commit to a
position that the next hat then has to respond to.

### 3.2 The document-by-someone-else instruction

When a hat starts, it treats everything above it as a document written by a
different person whose conclusions it is not obliged to accept. Say this
explicitly at the start of each hat's section. It is a small piece of
theatre, and it measurably changes what gets written, because it converts
"my earlier reasoning" into "a claim to evaluate".

### 3.3 RED runs deliberately blind

RED is the hat the sequential format damages most, because RED's entire value
is an uncontaminated first reaction and RED can see the whole argument.

The countermeasure is an explicit instruction at the point RED runs:

> Ignore everything above. Do not use any reasoning from WHITE, GREEN, YELLOW
> or BLACK. Look only at the finished deliverable, as someone meeting it cold
> with no context. Report what you feel in the first ten seconds.

This does not fully work — the reasoning is still in context. It works well
enough to be worth doing, and it is the single most important instruction in
this version.

### 3.4 BLACK is required to produce something

A sequential BLACK that has just watched itself build something will write
"this looks solid" unless forbidden. So it is forbidden.

**BLACK must produce at least one finding in the required three-part shape, or
state exactly what it checked and what it found clean.** "Looks good" is a
failed BLACK report and must be re-run. "Nothing to report" with no list of
what was checked is the same failure.

### 3.5 The bar is written first and graded item by item

BLUE grades by quoting each written criterion and giving pass or fail with the
evidence. Not an impression. A checklist.

The bar goes at the top of the conversation, before any work exists. In the
agent versions it lives in a file, where quietly editing it would be visible
in a diff. Here it lives in the transcript, which is weaker, so the rule is
explicit: **any change to a bar item must be announced** — which item, what it
now says, and why it changed.

### 3.6 The concrete anti-agreement rules

- BLACK may not endorse GREEN's build. If BLACK genuinely finds nothing, it
  lists what it checked, one line each, and says which checks it could not
  perform.
- YELLOW may not simply agree with BLACK. YELLOW's job is the opposite
  pressure. If YELLOW agrees that a BLACK finding must be fixed, it says what
  the cheapest acceptable fix is, not that the fix should be thorough.
- RED may not restate BLACK's points in different words. If RED's reaction
  happens to match a BLACK finding, RED says so in one clause and moves on.
- If two hats reach the same conclusion, the second one states why it got
  there independently. If it cannot, it says "no independent basis" — and
  that is a signal the round is collapsing.

---

## 4. Full role briefs

These are the authoritative briefs. Follow them exactly.

### WHITE — Facts and recon

**Owns:** ground truth. What is actually there.

WHITE goes and looks. It reads the real material, runs the real search,
checks the real numbers, opens the real document. It reports only what it
verified, and every claim carries its evidence — a quote, a file name, a
figure, a URL, a search result. No summaries of the general shape of things.

The test for a good WHITE report: **GREEN should be able to build from it
without re-checking anything.** If GREEN has to go and look for itself, WHITE
did not do its job.

WHITE ends every report with an explicit list of what it could *not* verify.
That list is as valuable as the facts — it is where the risk lives, and BLACK
will start there.

**WHITE never:** proposes a solution, speculates about why something is the
way it is, guesses at intent, or fills a gap with a reasonable assumption. A
gap goes in the unknowns list.

**Failure mode to avoid:** producing a tour of the subject. "The company sells
software to mid-market customers and has a freemium tier" is not useful.
"Pricing page lists three tiers at $0 / $29 / $99 per seat per month; the $0
tier caps at 3 users and has no API access (checked pricing page and the
linked comparison table, both retrieved today)" is useful.

**In sequential mode:** WHITE runs first and sees only the task. This is the
one hat where the sequential version loses nothing at all, because WHITE was
never supposed to see any other hat's output anyway.

### GREEN — Options and build

**Owns:** the work itself. GREEN is the only hat that writes the deliverable.

GREEN runs in two distinct modes and should never blur them.

**Design mode.** Produce **2–3 genuinely different approaches.** Different in
mechanism, not in detail — one approach flanked by two strawmen is a wasted
round, and the other hats will not be able to tell you anything useful about
it.

Always include the smallest possible change as one of the options, even when
it looks inadequate. It wins more often than anyone expects, and having it on
the list forces the bigger options to justify their extra cost.

For each option state: the mechanism in two or three sentences, what it costs
(time, complexity, new dependencies), what it assumes, and what it forecloses
later.

**Build mode.** Implement the one approach BLUE chose. Not a blend, not a
hedge, not all three. If the chosen approach turns out to be wrong mid-build,
stop and say so rather than quietly switching — that is a finding, and it goes
back to BLUE.

Keep changes small and reviewable. Report what was built **and what was
deliberately left out**, so the other hats review the real scope rather than
guessing at it.

**Failure mode to avoid:** gold-plating, silent scope expansion, and
implementing a defensive measure for every risk BLACK raised. GREEN answers
findings it agrees with and pushes back on the ones it does not.

**In sequential mode:** GREEN has seen BLACK's critique of its own options.
The temptation is to pre-emptively build the version BLACK will not object to.
Resist it — that is how the round loses its tension. Build the option BLUE
chose, at the scope BLUE set.

### YELLOW — Payoff and the simplest path

**Owns:** value per unit of complexity. YELLOW is not a cheerleader.

YELLOW's real function is to stop the work collapsing under BLACK's caution.
Left unopposed, an adversarial reviewer produces something safe, thorough, and
three times bigger than it needed to be. YELLOW is the counterweight.

In design mode YELLOW asks: which option delivers the actual outcome for the
least complexity? Is there a cheaper version that captures most of the value?
What does this unlock beyond the immediate ask?

In review mode YELLOW asks one question above all: **did we lose the point
while satisfying BLACK?** If the result now handles six edge cases and no
longer does the simple thing simply, that is YELLOW's finding to make.

YELLOW must be specific. Generic approval — "this is a solid approach" — is
worthless and should be treated as a non-answer. If YELLOW thinks there is a
cheaper path, it names that path concretely.

**Failure mode to avoid:** praise. YELLOW earns its slot by naming the
specific value at stake and the specific cheaper alternative, or by saying
plainly that there isn't one.

### BLACK — Risk, red team, and verification

**Owns:** what breaks, and proof of whether it holds up.

BLACK produces two separate outputs every round. Do not merge them.

**1. Verification — did it actually hold up?**

Check the thing against reality. Do the numbers add up when you recompute
them? Do the cited sources say what they are claimed to say — open them and
look? Does the plan survive contact with the actual constraints? For code,
walk the logic path by path and state what you traced. If something cannot be
checked from here, say so explicitly — an unverifiable claim is itself a
finding. Never report that something works because it looks like it should.

**2. Adversarial findings — what breaks**

What fails under load, under bad input, under hostile input, under an empty
result, under a slow or absent response. What breaks for the next person who
touches this in six months. What the checks do not cover. What happens on the
unhappy path nobody wrote.

**Every finding has three parts: a concrete trigger, a concrete consequence,
and a severity.** Section 7 has worked examples of the difference.

BLACK must produce at least one finding, or state explicitly what it checked
and found clean. **Silence is not a pass.** A BLACK report that says "looks
good" has failed and must be re-run.

Each round BLACK gets stricter: round 1 catches the obvious, round 2 assumes
the obvious was fixed and goes after the structural problem, round 3 attacks
the assumption the whole approach rests on.

**Failure mode to avoid:** nitpicking style and wording while missing the
structural flaw. If BLACK's findings are all cosmetic, it has not looked hard
enough.

**In sequential mode:** do not read the previous round's BLACK section until
you have formed this round's view. Then compare, and say which previous
findings you now think were wrong. Round 2 BLACK that only checks whether
round 1's findings were fixed has become a QA checklist, not a red team.

### RED — Gut and human reaction

**Owns:** the first ten seconds. No analysis.

RED answers one question: if someone lands on this cold — a user opening the
feature, a colleague opening the document, a customer reading the copy — what
do they feel immediately? Confusion? Friction? Distrust? "Why is this so
complicated?"

RED is explicitly allowed to be unjustified. That is the entire point of the
hat. The other five are reasoning their way to conclusions and will
rationalise away a real problem that they cannot articulate. RED says the
thing that the reasoning would have talked itself out of.

Format: **a one-line verdict first**, then at most three specific reactions.
Short. If RED is writing paragraphs it has turned into a second BLACK hat and
lost its value.

RED is the hat to drop first when a task is small or purely mechanical — a
data migration has no human on the other end of it. Do not run RED out of
habit.

**Failure mode to avoid:** reasoning. RED states the reaction, not the
argument for it. "The error message tells me what went wrong but not what to
do about it — I'd be stuck" is right. A paragraph analysing error-message
design theory is not.

**In sequential mode:** RED gets the explicit blinding instruction from §3.3
immediately before it runs. It is the most damaged hat in this version and the
one most worth protecting.

### BLUE — Control

**Owns:** the goal, the quality bar, the grade, and the done-call. BLUE runs
the process and is the only hat that decides anything.

**Before any work starts,** BLUE writes two things down:

1. **The goal statement** — one sentence describing the end state, in terms
   that can be checked. Not "improve the onboarding email" but "a new user who
   reads only the first screen of the email knows what to do next, verified by
   the email stating exactly one action above the fold."

2. **The quality bar** — 3 to 6 checkable criteria. Each one must be something
   a person could verify as met or not met without arguing about it. This is
   written *before* the work, so it cannot be quietly bent to fit whatever got
   built.

**Each round,** BLUE grades the work against the written bar, **item by item**,
quoting the criterion and giving the evidence for each verdict. Not an
impression of quality — a checklist with pass or fail and a reason per line.

Three possible verdicts:

- **PASS** — every bar item met, with evidence. Work is done.
- **REVISE** — specific, ordered instructions for GREEN. Name which findings
  to act on and which to ignore, and say why the ignored ones are acceptable.
  Vague revision instructions waste the next round.
- **ESCALATE** — stop and ask the human. Include the exact question, the
  options, and BLUE's own recommendation.

**The rules BLUE must not break:**

- **Never pass work because the round budget ran out.** If the bar is not met
  after the last round, report that plainly with what is still failing. A
  false pass is worse than an honest incomplete.
- **Never amend the quality bar silently.** If a criterion turns out to be
  wrong or impossible, say explicitly what changed and why.
- **Grade against the bar, not against effort.** Work that took three rounds
  and still misses a criterion has still missed it.

**Failure mode to avoid:** rubber-stamping round 3. The pressure to finish is
exactly when the grade has to stay honest.

---

## 5. Tiers — scale before anything else

The fastest way to make this method useless is to run six hats on something
that needed one. Six hats cost roughly six times the effort and a lot of
reading; that price is worth paying only when a wrong answer is expensive or
the problem genuinely has several defensible approaches.

Pick a tier before anything else, and say which tier was picked and why.

**Tier 0 — Solo. No team.** The answer is knowable, the path is obvious, or
the change is trivially reversible. Just do the task. Do not announce that a
team was considered. If it turns out harder than it looked, escalate to Tier 2
mid-flight.

**Tier 1 — Two hats: WHITE then BLACK.** Something needs checking against
reality and then checking for holes, but there is only one sensible approach.
Fact-checking a draft, reviewing something that already exists, a
well-specified small change.

**Tier 2 — Three hats: WHITE, GREEN, BLACK.** Real work with a real chance of
being wrong, but the approach is not in serious dispute. The common case, and
the default when unsure.

**Tier 3 — All six, one round.** The approach is genuinely contested, several
things could go wrong, or the output will be seen by people who are not you.
Features of real size, structural decisions, client deliverables.

**Tier 4 — All six, iterating up to three rounds.** High stakes, wide surface,
or a quality bar that will not be met on the first attempt.

> **Note on Tier 4.** In the Claude Code and Codex versions, Tier 4 also adds
> fan-out: WHITE spawns a dozen subagents to read a dozen modules in parallel,
> BLACK spawns one subagent per threat class. **That is not available here.**
> In this version, Tier 4 means the same six hats iterating for up to three
> rounds, with each hat working through a wide surface sequentially. On a
> genuinely wide surface, split the surface across several messages yourself
> — "WHITE, section 1 of 4" — rather than asking one pass to cover everything,
> because a single pass over a wide surface will summarise instead of verify.

**When in doubt, pick one tier lower and escalate.** Escalating costs one
extra round. Starting too high costs the whole budget.

---

## 6. The round, in sequential form

```
  RECON      WHITE alone. Ground truth, with evidence.
               |
  DESIGN     GREEN proposes 2-3 approaches
               |
             YELLOW reviews the options
               |
             BLACK reviews the options
               |
             BLUE picks one, on the record, with a reason
               |
  BUILD      GREEN implements the chosen approach
               |
  REVIEW     BLACK  (verification + findings)
               |
             RED    (blinded — deliverable only)
               |
             YELLOW (did we lose the point?)
               |
             BLUE grades against the written bar
               |
           PASS / REVISE / ESCALATE
```

In the agent versions, YELLOW and BLACK review the options at the same time,
and BLACK, RED and YELLOW review the build at the same time. Here they are
sequential, which has one real cost — later hats see earlier hats' reviews —
and one small benefit: YELLOW reviewing after BLACK can respond directly to
BLACK's findings, which is exactly YELLOW's job. **Run YELLOW after BLACK for
that reason.** Run RED between them, blinded, so its reaction is recorded
before YELLOW starts negotiating with BLACK.

**Rounds 2 and 3 skip RECON and DESIGN** unless round 1 showed WHITE's facts
were wrong — in which case re-running recon is the whole point of the round.
A revision round is normally just BUILD and REVIEW, which makes it much
cheaper than round 1.

**Round budget: 3.**

---

## 7. Feeding rules, adapted for sequential use

In the agent versions each hat receives only what it needs, and everything
else is genuinely invisible to it. Here nothing is invisible. So the feeding
table becomes an **attention contract**: what each hat should base its output
on, stated out loud at the start of its section.

| Hat | Should base its output on | Must not lean on |
|---|---|---|
| WHITE | The task alone | Nothing above it exists yet — good |
| GREEN (design) | The task, WHITE's report, the bar | — |
| YELLOW (on options) | GREEN's options, WHITE's unknowns | — |
| BLACK (on options) | GREEN's options, WHITE's unknowns | YELLOW's read of them |
| GREEN (build) | The chosen option, BLUE's reason, the findings to address | — |
| BLACK (on build) | The deliverable, the bar, what GREEN left out | Previous round's BLACK, until its own view is formed |
| RED | The deliverable ONLY | Everything else in the thread |
| YELLOW (on build) | The deliverable, the bar, BLACK's findings | — |
| BLUE | Everything | — |

Two rules matter more than they look, and both survive into this version as
explicit statements the model must make:

- **RED is blinded.** Before RED runs, state: "RED: ignoring all reasoning
  above, reacting to the deliverable only."
- **BLACK forms its own view first.** Before round 2's BLACK runs, state:
  "BLACK round 2: forming an independent view before reading round 1's
  findings." Then write the findings. Then, and only then, compare with round
  1 and note which of those findings you now disagree with.

Saying these out loud is not decoration. In a single-thread run it is the only
enforcement mechanism available.

---

## 8. Stopping

**PASS.** Every quality-bar item met with evidence. Report the result and say
what each hat contributed that actually changed the outcome. If the honest
answer is "RED changed nothing", say that — it tells you to drop RED next
time.

**REVISE.** Work goes back to GREEN with ordered, specific instructions. Round
counter increments.

**ESCALATE — stop and ask the human.** Immediately, regardless of round count,
when any of these is true:

- **The next action is irreversible** — publishing, sending, deleting,
  spending money, posting publicly, committing to a client.
- **The hats disagree on direction** and BLUE cannot pick without knowing
  something only the human knows: budget, deadline, risk appetite, who the
  audience is.
- **The quality bar itself looks wrong** — the work revealed that the stated
  goal was not the real goal.
- **WHITE's unknowns list contains something load-bearing** that cannot be
  resolved from available sources.

When escalating: state the question in one sentence, give the options with
their consequences, give BLUE's recommendation, and stop. Do not ask and keep
working.

**Budget exhausted.** After round 3 without a pass, report honestly. Give the
quality bar with pass/fail per item, the specific blocker, what was tried, and
what a fourth round would attempt. Do not pass work that did not meet the bar,
and do not silently continue past the budget.

---

## 9. The run log

There is no filesystem in ChatGPT Plus or Pro, so there is no run folder. The
conversation is the run log. Two workable options:

**Option A — the thread itself.** Every hat under its own heading, in order.
Simplest, and fine for Tier 1–3. The weakness is that the quality bar scrolls
away, so repost it at the top of each round.

**Option B — a canvas.** Ask for a canvas titled "Run log" and have the model
keep it updated with: tier, goal, bar, round number, each hat's headline
finding, and the current verdict. The canvas stays visible while the thread
scrolls. This is the closest thing available to the run folder, and it is
worth the extra step at Tier 4.

Either way, the final message should be readable cold by someone who saw none
of the run: what was decided, what was built, what is still open, what the
known risks are.

---

## 10. What good output looks like — worked examples

This section exists because vague output is the most common way a run fails
quietly. The hat runs, produces something that reads like review, and nobody
notices that it said nothing actionable.

### 10.1 A BLACK finding — code

**Weak (reject this):**

> Consider adding error handling to the sync function. Network calls can fail
> and it would be good to be defensive here.

Why it fails: no trigger (which failure, exactly?), no consequence (what
actually happens to the user or the system?), no severity, and no location.
GREEN cannot act on this without redoing BLACK's analysis. It is a feeling
about code quality dressed as a finding.

**Strong (accept this):**

> `sync.ts:42` — **Trigger:** the API returns HTTP 429 during a bulk sync.
> **Consequence:** the retry loop has no backoff and no attempt cap, so it
> retries immediately and forever; the worker never returns and the queue
> behind it stops draining. A single rate-limited account stalls sync for
> every account on that worker. **Severity: HIGH.** Not covered by tests —
> the test suite mocks only 200 and 500 responses (checked
> `sync.test.ts`, 11 cases, none with 429).

Why it works: GREEN can go to one line, reproduce the condition, and know when
it is fixed. The severity is arguable but the facts are not.

### 10.2 A BLACK finding — non-code

**Weak (reject this):**

> The pricing analysis seems optimistic. The growth assumptions might be too
> aggressive and I'd want to sanity-check the churn numbers.

Why it fails: "seems", "might be", "I'd want to" — this is a mood, not a
finding. It hands the work back to the reader. And BLACK was supposed to
*check* the numbers, not suggest that someone should.

**Strong (accept this):**

> Row 14 of the model, month 18 — **Trigger:** the sheet applies 5% monthly
> churn to new customers but 0% to the existing base, which is stated nowhere
> in the assumptions tab. **Consequence:** month-18 recurring revenue comes
> out at $412k; re-running it with 5% churn applied to the whole base gives
> $268k, a 35% overstatement, and the break-even month moves from 14 to 22 —
> past the runway stated on slide 3. **Severity: HIGH.** Verified by
> recomputing the column; the formula in D14 references only the
> new-customer range.

Why it works: it names where, states what was actually recomputed, gives the
size of the error, and connects it to a decision that changes.

### 10.3 A YELLOW review

**Weak (reject this):**

> Option B looks like a solid approach and should deliver good value. It
> balances the trade-offs well.

Why it fails: this is praise. It names no value, no alternative, and no cost.
Treat it as a non-answer and re-run YELLOW.

**Strong (accept this):**

> The point of this work is that support stops getting password-reset tickets.
> Option B does that, but so does the throwaway option — a link in the footer
> of the login page — which is one line of copy instead of a week of work.
> Option B is only worth its extra cost if we also want the audit trail, and
> nobody has asked for an audit trail. **Cheaper path: ship the footer link
> this week, measure the ticket volume for two weeks, and only build B if the
> tickets don't drop.** If BLACK's session-expiry finding gets fixed the way
> it proposes, B grows a settings screen and stops being the simple option at
> all — that is the point we would be losing.

Why it works: it names the actual outcome, names a concrete cheaper path with
a decision rule, and pushes back on a specific BLACK finding.

### 10.4 A RED reaction

**Weak (reject this):**

> The user experience here could be improved. The flow has several steps and
> research suggests that each additional step in a signup funnel reduces
> completion. The error states in particular may cause confusion because the
> messaging does not follow established conventions for actionable errors.

Why it fails: this is BLACK wearing RED's hat. It reasons, it cites, it
hedges. RED has one job and it is not this.

**Strong (accept this):**

> **Verdict: I'd close the tab.**
> - Four screens before I've seen anything the product does.
> - "Verification pending" with no idea how long — minutes or days?
> - The Continue button is grey. I genuinely don't know if I've finished.

Why it works: one line, then three reactions, all first-person and immediate.
No argument, no citation, nothing that could have been reasoned away.

### 10.5 A WHITE report

**Weak (reject this):**

> The competitor has a strong content marketing presence and publishes
> regularly. Their pricing is broadly similar to ours with a free tier.

**Strong (accept this):**

> - Pricing page (retrieved today): three tiers — Free, $29/seat/mo, $99/seat/mo.
>   Free caps at 3 seats, no API. Ours: two tiers, $39 and $149, no free tier.
> - Blog: 41 posts in the last 12 months, most recent 4 days ago (counted from
>   the archive page).
> - **Could not verify:** actual customer count — the "10,000+ teams" figure
>   appears only in their own homepage copy with no source. Their churn,
>   contract lengths, and enterprise pricing are not public.

Why it works: every claim has where it came from, numbers are numbers, and the
unknowns are listed rather than smoothed over. BLACK now knows exactly where
to start: the unsourced 10,000+ figure.

### 10.6 A BLUE grade

**Weak (reject this):**

> The work meets the quality bar. GREEN addressed BLACK's findings and the
> result is in good shape. PASS.

Why it fails: it grades an impression, not the bar. No criterion is quoted, no
evidence is given, and nobody reading it later can check whether the pass was
earned.

**Strong (accept this):**

> **Bar item 1 — "every claim about competitor pricing cites the page it came
> from".** PASS. All six pricing claims carry a retrieval date and page
> reference (checked each one against WHITE's report).
> **Bar item 2 — "the recommendation names one option, not a range".** PASS.
> Section 4 recommends the $39 tier only.
> **Bar item 3 — "the revenue model's break-even month survives recomputation".**
> **FAIL.** BLACK's churn finding (10.2) was acknowledged but not fixed —
> GREEN changed the assumptions tab to disclose the churn treatment rather
> than correcting the formula. The number on slide 3 is still $412k.
> **Verdict: REVISE.** GREEN: fix D14 to apply churn to the whole base,
> update slide 3, and restate the break-even month. Ignore BLACK's finding
> about the chart colours — cosmetic, and slide 3's number is the only thing
> the reader acts on.

Why it works: each criterion is quoted and judged with evidence, the fail is
specific, and the revision instruction is ordered and says what to skip.

---

## 11. Common ways this version fails

- **Everyone agrees and the run passes in one round.** Almost always means the
  hats collapsed. Re-run BLACK with the round-2 brief (go after the structural
  problem, not the obvious one) before accepting the pass.
- **The bar gets softened.** Watch for a criterion that is quoted differently
  in BLUE's grade than it was when written. Scroll up and compare.
- **RED turns into BLACK.** If RED writes more than about five lines, it has.
  Re-run it with the blinding instruction stated again.
- **GREEN's three options are one option and two strawmen.** If two of the
  three are obviously unusable, ask for a real second option before letting
  BLUE choose.
- **Tier inflation.** Six hats on a question that had one answer. The tier
  table exists to stop this; if the model skips it, ask which tier it picked
  and why.
- **Round 2 BLACK becomes a checklist.** If it only verifies that round 1's
  findings were fixed, it has stopped red-teaming. Round 2's job is the
  structural problem that round 1 was not looking for.
