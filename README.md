# SPELIX Capstone Mini Project (Claude Code Training — Day 5)

Fork this repository and build **one** of the three mini MES scenarios using
the full Claude Code workflow you learned in Days 1–4.

## Curriculum repositories

| Day | Lab | Repository |
| --- | --- | ---------- |
| 1–2 | Sample CRUD app (`/healthz`, CLAUDE.md, `/products`) | [day1_repository](https://github.com/yic-mes/day1_repository) |
| 3   | Brownfield refactor (legacy module) | [day3_repository](https://github.com/yic-mes/day3_repository) |
| 4   | Custom command + sub-agent + MCP (starter templates) | [day4_repository](https://github.com/yic-mes/day4_repository) |
| 5   | Capstone mini project (Option A/B/C specs) | this repo |

## Prerequisites

- No code from previous days is required — you fork this repo and build from
  scratch.
- The mandatory workflow uses your `/review` command and `test-writer`
  sub-agent from Day 4. Bring your improved versions — or, if you skipped
  Day 4, copy the starter templates from
  [day4_repository](https://github.com/yic-mes/day4_repository) into
  `.claude/` of your fork.
- Node.js 18+, npm 9+, Claude Code installed and logged in

## Choose one scenario

| Option | Scenario | Spec |
| ------ | -------- | ---- |
| A | QR Scan Event Log API + Mini UI | [docs/option-a-qr-scan-event-log.md](docs/option-a-qr-scan-event-log.md) |
| B | Work Order Screen | [docs/option-b-work-order-screen.md](docs/option-b-work-order-screen.md) |
| C | Inspection Checklist Form | [docs/option-c-inspection-checklist.md](docs/option-c-inspection-checklist.md) |

SQLite schemas are in [`schema/`](schema/), wireframe sketches for B and C in
[`wireframes/`](wireframes/).

## Mandatory workflow (non-negotiable)

1. **Plan Mode first** — not a single line of code before seeing a plan.
   Commit the plan as `PLAN.md`
2. **CLAUDE.md updated** — add your scenario's specific rules (validation
   rules, field names, API shape)
3. **Sub-agent for tests** — delegate test writing to your `test-writer`
   agent from Day 4
4. **Run `/review` before each commit** — fix every finding before committing
5. **Use `/clear` when stuck** — do not fight a confusing context for more
   than 20 minutes
6. **Small commits** — commit after each passing test. Aim for 8+ commits

## Workflow sequence

```
1. Plan Mode → PLAN.md → commit "docs: add plan"
2. Scaffold: basic project structure → commit
3. First endpoint/screen → test-writer agent → npm test passes → /review → commit
4. Second endpoint/screen → tests → /review → commit
5. [repeat for remaining components]
6. Final end-to-end manual test (curl or browser)
7. Record 5-minute demo
8. Write retrospective
```

## Deliverables (submit to #yic-mes-training)

- **GitHub fork link** — must include `PLAN.md`, `CLAUDE.md`,
  `.claude/commands/review.md`, `.claude/agents/test-writer.md`
- **5-minute screen recording demo** — working endpoints/UI in a browser or
  terminal
- **Final retrospective (~1 page)** — top 3 lessons, top 3 mistakes (and
  recovery), biggest unresolved question about Claude Code

## Implementation (this fork — Option B: Work Order Screen)

Built following the mandatory workflow. Plan is in [`PLAN.md`](PLAN.md); scenario
rules in [`CLAUDE.md`](CLAUDE.md). Stack: Express + better-sqlite3 + Jest/supertest.

```bash
npm install      # install dependencies
npm test         # run the Jest suite (48 tests: validation, filter, transitions, 404/409)
npm start        # serve API + screen at http://localhost:3000
```

- API: `POST /work-orders`, `GET /work-orders?status=`, `PATCH /work-orders/:id/status`.
- Screen: open `http://localhost:3000/` — filterable table with Start/Complete buttons.
- DB file path is configurable via `DB_PATH` (default `data.db`, gitignored); tests use `:memory:`.

Acceptance checklist (Option B) — all verified by tests and an end-to-end curl pass:

- [x] Create / list / filter by status all work
- [x] Status transitions enforced (no skipping, no going backward)
- [x] Duplicate `order_no` rejected with 409
- [x] Screen shows the list, filters, and toggles status via the API
- [x] All endpoints covered by Jest tests (happy path + validation + transitions)
