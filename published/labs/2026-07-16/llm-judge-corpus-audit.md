# Lab: Corpus audit for synthetic LLM-as-judge evals

## Curriculum unit

- Unit id: **1**
- Spec: `curriculum/llm-judge-test-oracle.md`
- Deepens: Project (Corpus Audit Memo) and Exercises A–C

## Observable end-state

Learner can run a corpus health gate on a synthetic judge-eval dataset, catch at least one planted stimulus fault (truncated/empty negative or shared decode budget), and emit a go / regenerate / hold decision backed by check outputs (files on disk), not by reading a command transcript.

## Time budget (90 min target)

| Step | Kind | Minutes | Notes |
|---|---|---|---|
| Open lab repo, skim README | prerequisite | 5 | Copy-paste clone; no cloud account |
| Inspect provided corpus + configs | target | 10 | Find shared max_tokens |
| Run length/emptiness checks | target | 15 | Script provided; learner tunes threshold |
| Planted-fault hunt (raw read sample) | target | 15 | 15 items, record degeneration rate |
| Positive control inject + re-run checks | target | 15 | Must catch injected truncate |
| Write audit memo into `out/decision.md` | target | 20 | Rubric fields required |
| Tooling install / path issues | noise | 5 | Pin Python 3.11+; no GPU |
| **Target share** | | **~75%** | |

## Environment shape

Ephemeral local workspace (no cloud provision):

- Small git repo with:
  - `data/pairs.jsonl`: ~40 synthetic {gold, negative, lang} rows; 6 rows pre-corrupted (truncate / empty / wrapper chat)
  - `configs/judge.yaml` and `configs/generate.yaml` sharing an unsafe `max_tokens: 5` on purpose
  - `tools/audit.py`: prints length table, emptiness flags, shared-key diff; writes `out/checks.json`
  - `tools/inject_fault.py`: truncates N clean negatives for positive control
- Pinned: Python ≥3.11, stdlib only for scripts (no model API keys required)
- Disposable: learner may delete `out/` between attempts

## Validation (system state)

Pass when **all** of the following exist and satisfy:

1. `out/checks.json` contains `shared_unsafe_keys` including `max_tokens` (or documented equivalent).
2. `out/checks.json` lists at least 4 of the 6 planted bad row ids under `flagged_negative_ids`.
3. After running inject, `out/positive_control.json` has `"caught": true`.
4. `out/decision.md` contains exactly one of `DECISION: go` | `DECISION: regenerate` | `DECISION: hold`, plus a `CHECKS:` bullet list (≥3).

Do **not** validate by matching shell history or requiring a specific command order.

## Explicit non-goals

- No live judge API calls
- No training or fine-tuning
- No cloud sandbox billing
