# Testing Whether Agent Optimizers Compound Over Time

## Learning objective

Engineer can design a two-round continual evaluation that checks whether an agent-optimization method keeps prior gains when new tasks arrive, instead of reporting only one-shot benchmark lift.

## Competency mapping

- **Competency:** `critical_evaluation`
- **Proficiency level:** 3

## Format call

- **Format:** `frontier_oneshot`
- **Why:** Specific harnesses and Terminal-Bench versions move quickly. The compounding question (one-shot lift is not continual competence) should be taught as a disposable evaluation pattern.

## Source

- Curated item **#3**: [Do Agent Optimizers Compound? A Continual-Learning Evaluation on Terminal-Bench 2.0](http://arxiv.org/abs/2607.14004v1) (tier 1)
- Digest topic: Agent Evaluation

## Time box

- Summary: 15 min
- Quizzes + exercises: 35 min
- Project: 45–75 min

## Summary

**What changed.** Most agent-optimizer papers report a one-shot gain on a fixed task set. Production agents are re-optimized as new failures arrive. The compounding question asks whether round-1 gains transfer to new tasks and survive a second optimization round without erasing prior wins.

**Why it matters for practice.** Promoting an optimizer into a recurring loop based only on static Phase-1 scores can install methods that overfit and then regress. Evaluation must separate static strength, transfer, and re-optimization behavior.

**Misconceptions to preempt.**

1. "Best Phase-1 score wins." Phase-1 leaders can transfer below baseline.
2. "Hold out a test set after search finishes." Regression control that only runs post-hoc is weaker than rejecting regressing edits inside the search loop.
3. "Benchmarks with independent tasks equal production." Independence is a simplifying assumption; still useful for a minimal continual protocol.

**Key terms.** compounding; transfer; re-optimization; regression control; lifelong average pass rate.

## Quizzes

1. **(remember)** Which three properties does the two-phase protocol try to separate?
   - **Answer:** Static optimization strength, transfer to unseen tasks, continued improvement under re-optimization.

2. **(understand)** GEPA improved in Phase 1 but transferred poorly. What failure mode is that?
   - **Answer:** Overfitting to the Phase-1 task distribution (shortcut solutions that do not generalize).

3. **(apply)** Your optimizer gains +12% on T1 then loses 8% of those gains when T2 appears before any re-opt. Which property failed?
   - **Answer:** Transfer (positive generalization to unseen tasks).

4. **(apply)** Spot the failure: a report shows only "post-optimization pass rate on the training tasks." What is missing for a compounding claim?
   - **Answer:** Held-out / newly arrived tasks, a second optimization round, and a retention or lifelong metric.

## Exercises

### Exercise A: Protocol sketch

- **Goal:** Write T1 / T2 / Phase-1 / Phase-2 boxes for a toy 6-task set.
- **Steps:** Partition tasks; define when transfer is measured; define when re-opt starts.
- **Self-check:** A reader can see three distinct scores, not one.
- **Time:** 15 min

### Exercise B: Retention metric

- **Goal:** Define one retention metric in plain language and formula sketch (e.g. pass rate on previously solved tasks after round 2).
- **Self-check:** Metric would drop if round-2 edits destroy round-1 skills.
- **Time:** 10 min

### Exercise C: Optimizer promotion gate

- **Goal:** Write accept/reject rules for promoting an optimizer into a weekly loop.
- **Self-check:** Rules mention transfer and non-regression, not only Phase-1 lift.
- **Time:** 10 min

## Project

- **Brief:** Design a **two-round compounding eval plan** for an agent you care about (coding agent, support agent, or Terminal-Bench-style suite).
- **Constraints:** One page plus a tiny table. No need to run the eval. Assume identical optimization budgets across methods if comparing more than one.
- **Deliverable:** Plan with task split, metrics, decision rule (`compounds` / `does not` / `inconclusive`), and what telemetry you would store per round.
- **Rubric:**
  - **Protocol completeness:** Phase 1, transfer check, Phase 2 are distinct.
  - **Metrics:** Includes retention or lifelong average, not only peak pass rate.
  - **Decision rule:** Clear thresholds or qualitative stop rules.
  - **Honesty about limits:** Notes task independence or other caveats.
- **Stretch:** Compare how you would detect missing in-loop regression control from outcome patterns alone.

## Evidence of mastery

Learner delivers the one-page plan with two rounds, an explicit retention metric, and a compounds / does not / inconclusive rule.

## Telemetry hooks

- `unit_opened` → `summary_completed`
- `quiz_attempted` / `quiz_passed`
- `exercise_submitted` (`A` | `B` | `C`)
- `project_started` / `project_completed`
- `transfer_observed` if the protocol is later used on a real agent rollout
