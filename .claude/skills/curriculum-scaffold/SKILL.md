---
name: curriculum-scaffold
description: Turn a curated item or forecast-watchlist topic into a scaffolded curriculum unit with summary, quizzes, exercises, and a project, mapped to the competency model. Use when the user wants curriculum drafted from a topic, or asks to scaffold a lesson from something in the digest.
---

# Curriculum Scaffolding Agent

This is where a story becomes teaching, not just news. Every unit is judged first on whether the learning objective is an *observable behavior*, not a topic. "Engineer can evaluate whether a RAG pipeline's retrieval step is the actual failure point versus the generation step" is designable and testable. "Engineer understands RAG" is neither.

## Pedagogical stack (use all of these)

Design in this order. Do not invent activities before the objective and evidence are written.

1. **Backward design (UbD / Wiggins & McTighe).** Stage 1 desired results → Stage 2 evidence → Stage 3 learning plan. Never start from "cool paper, explain it."
2. **Bloom / depth of processing.** Summary targets remember/understand. Quizzes check remember/understand with a little apply. Exercises are apply/analyze. The project is analyze/evaluate/create against the objective.
3. **Formative then summative.** Quizzes and exercises are formative (retrieval practice, feedback). The project is the primary summative performance for mastery.
4. **Deliberate practice.** Exercises isolate one hard sub-skill with feedback; the project integrates them under realistic constraints.
5. **Constructive alignment (Biggs).** Every quiz item, exercise, and project rubric criterion must trace to the objective. Drop anything that does not.

For frontier topics, prefer a thinner summary and a sharper project. Do not pad with trivia.

## The competency model

Every unit maps to exactly one of these four, at one of four proficiency levels (1 = novice, 4 = expert):

1. **tool_operation**: directing AI tooling to produce useful output
2. **critical_evaluation**: judging AI output: spotting hallucinated APIs, insecure patterns, subtle logic errors
3. **workflow_integration**: choosing when (and when not) to use AI, decomposing tasks for it
4. **building_ai_native**: designing, evaluating, and shipping AI-native features

If a topic doesn't cleanly map to one of these four, it's probably not curriculum-worthy yet. Flag it back to the forecast watchlist instead of forcing a unit.

## Required spec sections

Draft `curriculum/<slug>.md` with **all** of the following headings, in this order. Omit nothing; if a section would be empty, the topic is not ready.

### 1. Title and meta

`# <Title>`

Then: learning objective (one observable sentence), competency + proficiency, format call (`durable_course` | `frontier_oneshot`) with why, source curated item link, estimated time (summary / practice / project).

### 2. Summary

Teach the durable idea in 3–7 short paragraphs or tight bullets. Name mechanisms, not hype. Include:

- **What changed** (the idea or finding in plain language)
- **Why it matters for practice** (who does what differently)
- **Misconceptions to preempt** (2–3 common wrong reads)
- **Key terms** (only those needed for quizzes and the project)

### 3. Quizzes

Formative retrieval. Prefer short, checkable items.

- **3–6 items** total for `frontier_oneshot`; **5–10** for `durable_course`
- Mix: multiple choice, short answer, and at least one "spot the failure" scenario
- For each item: question, correct answer, 1–2 sentence feedback for wrong paths
- Tag each item with Bloom level (`remember` | `understand` | `apply`)
- No trick questions about brand names that will rot in six weeks

### 4. Exercises

Guided practice before the project. **2–4 exercises**.

For each exercise:

- **Goal** (observable, subset of the unit objective)
- **Setup** (inputs, snippets, or links; keep prerequisite noise low)
- **Steps** (numbered; say what "good" looks like mid-way)
- **Feedback / self-check** (how the learner knows they are done without a teacher)
- **Time estimate**

Exercises should be completable without provisioning cloud labs. If an exercise needs a sandboxed environment, note that and point lab-generation at it later; still write a paper-or-local alternative here.

### 5. Project

Summative performance task aligned to the full objective.

- **Brief**: what to produce and for whom
- **Constraints**: time box, allowed tools, what not to do
- **Deliverable**: concrete artifact (memo, checklist, eval harness sketch, PR description, etc.)
- **Rubric** (3–5 criteria, each with pass / strong signals). Rubric criteria must restated from the objective, not "wrote complete sentences"
- **Stretch** (optional): one harder variant for proficiency 3–4

If a fuller lab environment is warranted, say so in one line and leave detailed env shape to `/lab-generation`. The project brief here must still stand alone.

### 6. Evidence of mastery and telemetry hooks

- Restate the mastery evidence in one short paragraph (what artifact + what quality bar).
- List the **telemetry events** this unit should emit when someone actually runs it (see below). Use `python3 scripts/db.py log-telemetry ...` when logging by hand.

## Telemetry and metrics

This repo does not instrument a 10k-engineer LMS. Telemetry is intentionally small and honest. Prefer **behavior and performance evidence** over completion vanity.

### Event vocabulary (`telemetry_events.event_type`)

Pipeline / desk events (existing):

- `surfaced` | `opened` | `cited_in_post` | `promoted_to_curriculum`

Learning events (attach `--curriculum-unit-id` when logging):

- `unit_opened` — learner started the unit
- `summary_completed` — marked summary read (self-report is fine at this scale)
- `quiz_attempted` / `quiz_passed` — detail may include score like `4/6`
- `exercise_submitted` — detail names the exercise id/slug
- `project_started` / `project_completed` — completion means rubric pass, not "submitted something"
- `transfer_observed` — later reuse on a real task (Level 3 behavior). detail should say what was reused

Log with either a curated item, a curriculum unit, or both:

```
python3 scripts/db.py log-telemetry --curriculum-unit-id <id> --event-type quiz_passed --detail "5/6"
python3 scripts/db.py log-telemetry --curated-item-id <id> --curriculum-unit-id <id> --event-type promoted_to_curriculum
```

### Metrics to compute later (do not fake them in the spec)

| Question | Signal | Anti-pattern |
|---|---|---|
| Did they engage? | `unit_opened` → `summary_completed` rate | Page views alone |
| Did they learn the concept? | `quiz_passed` rate and item misses | Perfect scores after peeking at answers |
| Can they perform? | `exercise_submitted` + `project_completed` with rubric pass | "Finished" without rubric |
| Did it change practice? | `transfer_observed`, `cited_in_post` on related work | Smile sheets |
| Is the unit decaying? | Falling quiz/project pass rates, scout drift on source topic | Never deleting units |

Report learning metrics at **unit or cohort** grain in any future dashboard. Do not design per-person scoreboards; once a measure becomes a performance target, it stops being a good measure.

## Process

1. **Pick the source.** A curated item or a matured `forecast_watchlist` entry.
2. **Write the objective first**, then evidence of mastery, then summary → quizzes → exercises → project.
3. **Make the durable-vs-frontier call** and write why.
4. **Draft the full spec** under `curriculum/<slug>.md` (create `curriculum/` if needed).
5. **Record it:**
   ```
   python3 scripts/db.py insert-curriculum-unit --title "<title>" --competency <tool_operation|critical_evaluation|workflow_integration|building_ai_native> --proficiency-level <1-4> --format <durable_course|frontier_oneshot> --source-curated-item-id <id> --spec-path curriculum/<slug>.md
   ```
6. **Optional:** `log-telemetry --curated-item-id <id> --curriculum-unit-id <new-id> --event-type promoted_to_curriculum`
7. **Hand off to editorial review.** Leave status `drafted`. Do not ship.

## Writing style

No em-dashes. Use a colon, comma, or period instead. Direct, no hype adjectives. Name mechanisms.

## Completion criterion

All of the following are true:

- Objective is an actor + observable verb sentence
- Spec contains Summary, Quizzes, Exercises, and Project with the required subsections
- Every quiz item and exercise maps to the objective (constructive alignment)
- Project rubric would let a reviewer pass/fail without watching the learner work
- Telemetry hooks are listed for the learning events that apply
