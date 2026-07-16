# MultiAgentEDUstack

A multi-agent curriculum pipeline that sources AI knowledge, curates it by credibility, and scaffolds it into curriculum units and lab specs. SQL is the durable store; generated markdown is a regenerable view.

## Language

### Ingestion and curation

**Scout**:
A scheduled collector that fetches items from one source class (arXiv, HN, GitHub trending, blogs, YouTube, Reddit, Bluesky, X) and lands them as raw items. No LLM call.
_Avoid_: crawler, scraper, fetcher, ingest agent

**Raw item**:
A single fetch result from a scout, stored before credibility scoring and dedup. Unique per `(scout, source_url)`.
_Avoid_: article, post, story (until curated)

**Curated item**:
One distinct story after credibility scoring and merge. Raw items that describe the same story point at the same curated item.
_Avoid_: story, article, news item

**Tier**:
Credibility band 1 (primary research) through 5 (social chatter) assigned during dedup.
_Avoid_: priority, score, rank

**Dedup**:
The rule-based pass that scores tiers and merges raw items into curated items. Exact URL first, then title similarity.
_Avoid_: clustering, LLM ranking

### Synthesis and forecast

**Digest**:
A daily, topic-grouped markdown brief of newly curated articles, produced by synthesis-digest. Topics get written back onto curated items.
_Avoid_: newsletter, report, summary (as the artifact name)

**Wiki page**:
A Sunday rollup of that week's daily digests into a durable teaching-oriented summary, produced by weekly-wiki. Regenerable build artifact, like digests.
_Avoid_: encyclopedia, knowledge base, second digest

**Forecast watchlist**:
Leading-indicator candidates likely to matter in roughly 8–12 weeks. Velocity and signal, not volume.
_Avoid_: trends list, backlog, roadmap

### Curriculum and labs

**Curriculum unit**:
A scaffolded learning unit with objective, competency mapping, proficiency level, and durable-vs-frontier format. Produced by curriculum-scaffold; status moves drafted → reviewed → shipped → archived.
_Avoid_: course, lesson, module (unless referring to a deep-module design term)

**Competency**:
One of: tool operation, critical evaluation, workflow integration, building AI-native.
_Avoid_: skill (when meaning competency), learning outcome (prefer the unit's objective wording)

**Lab spec**:
A written specification for a hands-on lab tied to a curriculum unit. Spec only; this system does not provision live cloud infrastructure.
_Avoid_: lab environment, sandbox, provisioned lab

**Editorial review**:
A human-gated two-axis review (pedagogical + technical) of a digest, curriculum unit, or lab spec. An approved decision is recorded only after a human states it.
_Avoid_: auto-approve, CI gate

**Decay flag**:
A staleness signal on a shipped curriculum unit recommending regenerate or archive.
_Avoid_: deprecation notice, todo

### Engineering (repo practice)

**Deep module**:
A design term from the codebase-design skill: lots of behaviour behind a small interface at a clean seam. Not a curriculum unit.
_Avoid_: service, component (when discussing module shape)

**Seam**:
The public boundary you design and test against (Michael Feathers). Tests live at seams, not against internals.
_Avoid_: boundary, API surface (when the seam is the topic)
