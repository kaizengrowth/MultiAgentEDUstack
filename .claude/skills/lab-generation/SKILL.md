---
name: lab-generation
description: Draft a hands-on lab spec for a curriculum unit: objective, target/prerequisite/noise time breakdown, state-based validation plan. Use when the user wants a lab designed for a curriculum unit, or asks for hands-on practice material.
---

# Lab Generation Agent

**Scope note, read this first:** this agent drafts a lab *spec* (markdown: objective, environment shape, validation plan) as something a human then builds or has a cloud-lab platform build. It does not provision live cloud infrastructure, this repo has no cloud credentials wired in, and standing up billed resources isn't something an unattended scheduled agent should do on its own judgment. If you're the one running this and you want the spec turned into a real sandboxed environment, that's a separate, explicitly-authorized step you take by hand.

## Discipline, not vibes

A lab is a performance environment, not a content-delivery mechanism. Every minute of intended lab time is one of three things, and the spec must say which:

- **Target**: the skill actually being practiced. Get this above 60% of the lab; first drafts land under 30% without deliberate effort.
- **Prerequisite**: assumed skills (console navigation, basic git). Either verify before entry or scaffold away with copy-paste blocks.
- **Noise**: provisioning delay, flaky dependencies, ambiguous instructions. Eliminate, don't budget for.

## Process

1. **Take the curriculum unit** (`python3 scripts/db.py pending-review` shows units awaiting review; a lab can be drafted for any `drafted` unit before or during that review). Read its spec file for the learning objective.
2. **State the objective as an observable end-state** before writing anything else: "learner can configure a retrieval eval and identify which of three failure modes is occurring," not "learner practices RAG evaluation."
3. **Classify every planned step** as target/prerequisite/noise and write that breakdown into the spec explicitly, with a rough time estimate per step. If target time doesn't clear ~60%, cut steps or add scaffolding for the prerequisite parts before finalizing.
4. **Specify validation as system state, not command history**: what the environment checks to confirm the learner succeeded (a config exists, an endpoint returns a specific response, an eval catches an injected failure), never "ran the expected command." State-based validation is what allows more than one correct path; command-matching teaches a false single-incantation model.
5. **Write the environment shape**: what needs to exist (a scratch repo, a mock API, a small dataset), pinned versions for anything version-sensitive, and an explicit note that it should be ephemeral/disposable per learner attempt if it's ever actually built.
6. **Save the spec** to `labs/<slug>.md` (gitignored runtime output) and record it:
   ```
   python3 scripts/db.py insert-lab-spec --curriculum-unit-id <id> --objective "<the observable end-state>" --spec-path labs/<slug>.md --target-time-pct <your estimate>
   ```

## Writing style

No em-dashes in anything you write here (digests, specs, notes). Use a colon, comma, or period instead. This is a standing preference for everything this pipeline produces, not just this skill.

## Completion criterion

The spec answers, in writing: what does the learner do, what fraction of that time is target vs. prerequisite vs. noise, and how does the environment know they succeeded without you having to read a transcript of their commands. If any of those three is missing, the spec isn't done.
