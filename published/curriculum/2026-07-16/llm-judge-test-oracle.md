# Validating LLM-as-Judge Corpora Before You Trust the Score

## Learning objective

Engineer can audit a synthetic LLM-as-judge evaluation corpus for silent generation failures (truncated or empty "hallucinated" answers, shared decoding budgets, mismatched producer settings) and decide whether a reported judge bias result is still valid.

## Competency mapping

- **Competency:** `critical_evaluation`
- **Proficiency level:** 3

## Format call

- **Format:** `durable_course`
- **Why:** The failure mode is structural (shared generation/judge parameters, weak test oracles for synthetic negative examples). Tool names will churn; the need to validate corpora before interpreting judge metrics will not.

## Source

- Curated item **#13**: [The Test Oracle Problem in Synthetic LLM-as-Judge Corpora](http://arxiv.org/abs/2607.13707v1) (tier 1)
- Digest topic: LLM Judges

## Time box

- Summary: 20 min
- Quizzes + exercises: 45 min
- Project: 60–90 min

## Summary

**What changed.** Many LLM-as-judge bias studies build synthetic pairs by prompting a model to invent a "hallucinated" answer beside a factual one. That generation step is treated as infrastructure. When it silently fails (for example a shared `max_tokens` budget that truncates negatives to a few words), aggregate judge metrics can invent a large, statistically "robust" effect that disappears once the corpus is fixed.

**Why it matters for practice.** If your evaluation negatives are LLM-generated, you are in an oracle-less regime: there is no cheap mechanical check that each negative is a valid stimulus. Downstream A/B tests, bias reports, and model comparisons inherit that fault. Teams shipping internal judge harnesses need a corpus health gate before they trust any score.

**Misconceptions to preempt.**

1. "We replicated at N=500, so the effect is real." Replication on a broken stimulus still replicates the artifact.
2. "Aggregate robustness checks will catch bad items." Those checks watch judge behavior, which is downstream of stimulus integrity.
3. "Only exotic multilingual setups fail." Shared decode budgets and truncated negatives show up in ordinary English pipelines too.

**Key terms.** test oracle; LLM-generated negative; mechanical perturbation; stimulus integrity; formative corpus audit.

## Quizzes

1. **(remember)** In the paper's corrupted pipeline, what shared parameter truncated hallucinated answers?
   - A) temperature  
   - B) max_tokens / decoding budget  
   - C) top-p  
   - D) system prompt language  
   - **Answer:** B. Feedback: The budget was enough for one-token judge outputs and catastrophic for paragraph-length generations.

2. **(understand)** Why did four aggregate robustness checks fail to find the fault?
   - **Answer:** They operate on judge behavior after items exist; they cannot see item-level degeneration. Feedback: Stimulus faults need item-level checks, not only score stability.

3. **(understand)** What design gives you a free item-level oracle for negatives?
   - A) Sampling hallucinations from a second model family  
   - B) Deterministic perturbation of a gold answer  
   - C) Larger N  
   - D) Multi-judge panels  
   - **Answer:** B. Feedback: Gold-to-negative string relations are checkable; sampled hallucinations are not.

4. **(apply)** You see a 30-point accuracy collapse on one language only. First diagnostic step?
   - **Answer:** Manually read a sample of raw generated negatives (length + degeneration) before trusting the metric. Feedback: The paper's catch was reading raw text, not another aggregate test.

5. **(apply)** Spot the failure: negatives average 4 tokens; gold answers average 80. Judge prefers gold with p<<0.001. What do you conclude?
   - **Answer:** Suspect truncated/degenerate negatives; do not publish the bias claim until corpus health passes. Feedback: Extreme length asymmetry is a corpus red flag, not proof of judge bias.

## Exercises

### Exercise A: Length and emptiness gate

- **Goal:** Detect truncated or empty negatives before any judge run.
- **Setup:** Use any 10 synthetic pairs (or invent 10 with 2–3 deliberately truncated).
- **Steps:**
  1. Compute token/char length for gold vs negative.
  2. Flag emptiness, near-emptiness, and length ratio below a threshold you choose.
  3. Write the threshold rule in one sentence.
- **Self-check:** At least the planted bad items are flagged; false-positive rate on clean items is noted.
- **Time:** 15 min

### Exercise B: Shared-parameter hunt

- **Goal:** Find dangerous shared settings between generation and judging configs.
- **Setup:** Two JSON/YAML snippets (judge vs generator) you write or pull from a toy harness.
- **Steps:** List every shared hyperparameter; mark which ones are unsafe to share; propose split values.
- **Self-check:** `max_tokens` (or equivalent) is explicitly split; rationale is written.
- **Time:** 15 min

### Exercise C: Oracle-bearing rewrite

- **Goal:** Convert one LLM-generated-negative item into a mechanical-perturbation negative.
- **Setup:** One gold answer paragraph.
- **Steps:** Apply a deterministic transform (negation of a key fact, entity swap, number edit). Document the transform so a script could check it.
- **Self-check:** A string-level check would catch a failed transform 100% of the time.
- **Time:** 15 min

## Project

- **Brief:** Produce a **Corpus Audit Memo** for a synthetic judge evaluation your team might run (real or hypothetical). Decide go / regenerate / hold.
- **Constraints:** 2 pages max. No new model training. You may invent a small corpus, but you must show the audit artifacts (tables or checklists), not only prose.
- **Deliverable:** Memo with (1) corpus construction description, (2) health checks run, (3) findings, (4) decision and ownership for fix.
- **Rubric:**
  - **Stimulus integrity:** Names oracle-less vs oracle-bearing design correctly for the corpus.
  - **Checks:** At least three concrete health checks; one must be manual raw-item read or equivalent.
  - **Decision quality:** go/regenerate/hold is justified by evidence, not vibes.
  - **Transfer:** States what would be monitored next time (telemetry-friendly).
  - **Strong:** Includes a minimal positive-control idea (inject a known bad negative and show the check catches it).
- **Stretch:** Draft a 15–20 item raw-read protocol with degeneration rate thresholds derived from the paper's case.

## Evidence of mastery

Learner produces the audit memo above with three health checks, one silent-failure example that would invalidate a claim, and a clear ship/regenerate/hold recommendation.

## Telemetry hooks

When running this unit, log against its `curriculum_unit_id`:

- `unit_opened` → `summary_completed`
- `quiz_attempted` / `quiz_passed` (detail e.g. `4/5`)
- `exercise_submitted` (detail `A` | `B` | `C`)
- `project_started` / `project_completed` (only on rubric pass)
- `transfer_observed` if the checklist is later used on a real judge eval
