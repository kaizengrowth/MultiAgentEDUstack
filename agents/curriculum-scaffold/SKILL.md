---
name: curriculum-scaffold
description: Turn a curated item or forecast-watchlist topic into a scaffolded curriculum unit -- a learning objective mapped to the competency model, a durable-vs-frontier format call. Use when the user wants curriculum drafted from a topic, or asks to scaffold a lesson from something in the digest.
---

# Curriculum Scaffolding Agent

This is where a story becomes teaching, not just news. Every unit produced here gets judged on one thing: is the learning objective an *observable behavior*, not a topic. "Engineer can evaluate whether a RAG pipeline's retrieval step is the actual failure point versus the generation step" is designable and testable. "Engineer understands RAG" is neither, and a unit that only clears that low bar should not exist.

## The competency model

Every unit maps to exactly one of these four, at one of four proficiency levels (1 = novice, 4 = expert):

1. **tool_operation** — directing AI tooling to produce useful output
2. **critical_evaluation** — judging AI output: spotting hallucinated APIs, insecure patterns, subtle logic errors
3. **workflow_integration** — choosing when (and when not) to use AI, decomposing tasks for it
4. **building_ai_native** — designing, evaluating, and shipping AI-native features

If a topic doesn't cleanly map to one of these four, it's probably not curriculum-worthy yet — flag it back to the forecast watchlist instead of forcing a unit.

## Process

1. **Pick the source.** Either a specific curated item (`python3 scripts/db.py new-items`) or a `forecast_watchlist` entry with `status = 'watching'` that's matured enough to teach now, not just track.
2. **Write the objective first, everything else after.** One sentence, an observable behavior, using [backward design](https://en.wikipedia.org/wiki/Understanding_by_Design): outcome, then evidence for it, then the activity — never start from "here's a cool thing, let me explain it."
3. **Make the durable-vs-frontier call explicitly**, and write down *why*: does this belong in the stable library (`format: durable_course`), or is the underlying tool likely to look different in six weeks, making a disposable one-pager the honest choice (`format: frontier_oneshot`)? Forcing frontier content into a heavyweight course is the single most common way curriculum falls behind — don't do it by default.
4. **Draft the spec** as a markdown file under `curriculum/<slug>.md` (gitignored runtime output) with: the objective, the competency + proficiency level, the durable/frontier call and reasoning, a short outline of what the learner does, and a link back to the source item.
5. **Record it:**
   ```
   python3 scripts/db.py insert-curriculum-unit --title "<title>" --competency <tool_operation|critical_evaluation|workflow_integration|building_ai_native> --proficiency-level <1-4> --format <durable_course|frontier_oneshot> --source-curated-item-id <id> --spec-path curriculum/<slug>.md
   ```
6. **Hand off to editorial review.** Do not mark this unit `shipped` yourself — that decision belongs to the human-gated editorial-review agent. Leave it `drafted`.

## Completion criterion

The spec file states the learning objective as a sentence starting with an actor and an observable verb ("Engineer can...", "Learner identifies..."), not a noun phrase ("Understanding of...", "Introduction to..."). If you can't write it that way, the topic isn't ready to scaffold yet — say so instead of forcing a weak objective through.
