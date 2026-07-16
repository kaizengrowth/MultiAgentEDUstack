# Lab: Two-round compounding eval for an agent optimizer

## Curriculum unit

- Unit id: **2**
- Spec: `curriculum/agent-optimizer-compounding.md`
- Deepens: Project (two-round compounding eval plan) and Exercises A–C

## Observable end-state

Learner can produce a machine-checkable eval plan artifact that defines T1/T2 task splits, Phase-1 / transfer / Phase-2 scores, a retention metric, and a compounds / does-not / inconclusive decision rule, with fixture scores demonstrating that a Phase-1-only "winner" can fail transfer.

## Time budget (75 min target)

| Step | Kind | Minutes | Notes |
|---|---|---|---|
| Read lab brief + open worksheet | prerequisite | 5 | No cloud |
| Partition 8 fixture tasks into T1/T2 | target | 10 | JSON edit |
| Fill Phase-1 / transfer / Phase-2 table | target | 15 | Use provided fake run logs |
| Define retention + lifelong average in `plan.yaml` | target | 10 | Schema validated |
| Write decision rule + apply to fixtures | target | 15 | Must flag GEPA-like overfitting case |
| Export `out/plan.json` + short rationale | target | 15 | |
| Schema confusion / YAML typos | noise | 5 | Validator script gives line hints |
| **Target share** | | **~73%** | |

## Environment shape

Local only:

- `fixtures/tasks.json`: 8 named tasks with tags
- `fixtures/runs/`: three optimizer result stubs (baseline, overfit-happy, regression-aware) with per-phase pass vectors
- `schema/plan.schema.json`: required keys for the learner plan
- `tools/validate_plan.py`: checks schema + that decision rule labels the overfit stub `does_not` or `inconclusive` (not `compounds`)
- No GPUs, no API keys, no Terminal-Bench download required (fixtures stand in)

## Validation (system state)

Pass when:

1. `out/plan.json` validates against `schema/plan.schema.json`.
2. `out/plan.json` includes non-empty `t1_task_ids`, `t2_task_ids`, `retention_metric`, and `decision_rule`.
3. `out/labels.json` maps each fixture optimizer id to `compounds` | `does_not` | `inconclusive`.
4. The overfit-happy fixture is **not** labeled `compounds`.
5. `out/rationale.md` is ≤400 words and mentions transfer and retention explicitly.

Do not grade by command transcript.

## Explicit non-goals

- Not running real Terminal-Bench or paid agent rollouts
- Not implementing GEPA/Meta-Harness/RELAI code
- Not provisioning cloud runners
