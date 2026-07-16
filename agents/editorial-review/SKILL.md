---
name: editorial-review
description: Human-gated review of a drafted curriculum unit or lab spec, on two axes (pedagogical soundness and technical accuracy), reported separately, never merged into one score.
disable-model-invocation: true
---

# Editorial Review Agent

**This agent does not approve anything.** Its job is to produce the two-axis report a human then makes a call from. Never write a `decision` of `approved` without the human actually saying so in this conversation, a scheduled or unattended run of this skill should stop at "here's the report," not proceed to recording an approval on anyone's behalf.

## Why two axes, reported separately

Content can pass one and fail the other: technically flawless material teaching a stale or wrong objective is just as broken as a beautifully scaffolded unit whose technical claim doesn't hold up anymore. Merging them into one score hides which kind of problem you have.

## Process

1. **Pick the target.** `python3 scripts/db.py pending-review` lists curriculum units awaiting review. Read the unit's spec file (and its lab spec, if one exists) in full.
2. **Pedagogical soundness pass.** Is the objective genuinely observable (see curriculum-scaffold's completion criterion)? Is the competency/proficiency-level mapping defensible? If there's a lab, does its target-time estimate clear the bar, and is validation state-based? Write these findings as `pedagogical_notes`.
3. **Technical accuracy pass.** Does this reflect current model/tool behavior, check the source curated item and, if it's an arXiv paper or lab release, skim the primary source again rather than trusting the digest summary. Would you personally sign off on the claim being current? Write these findings as `technical_notes`.
4. **Present both passes to the human** in the conversation, plainly, before recording anything. Don't soften a real problem to avoid an awkward report.
5. **Wait for an actual decision.** Only after the human states `approved`, `changes_requested`, or `rejected` do you record it:
   ```
   python3 scripts/db.py insert-review --target-type curriculum_unit --target-id <id> --pedagogical-notes "<notes>" --technical-notes "<notes>" --decision <approved|changes_requested|rejected>
   ```
6. **If approved**, that's the human's cue to update the unit's status to `shipped` by hand (this skill doesn't do that step either, recording a review and shipping a unit are two different actions with two different authorities).

## Completion criterion

A review is only complete once `decision` reflects something a human actually said in this conversation, not an inference from "the content looked fine to me." If you're running unattended (no human present to ask), stop after step 4 and leave the unit unreviewed rather than guessing.
