---
description: Review the staged git diff for style, error handling, test coverage, and security issues
argument-hint: "[optional: area to focus on, e.g. 'security']"
allowed-tools: Bash(git diff:*), Bash(git status:*), Read, Glob, Grep
---

## Context

- Staged diff to review:

```
!`git diff --cached`
```

- Files staged:

```
!`git diff --cached --name-only`
```

## Your task

You are reviewing the **staged** changes above before they are committed. If a
focus area was provided (`$ARGUMENTS`), weight your review toward it but still
cover everything.

If the staged diff is empty, stop and tell the user to stage changes first with
`git add` — do not review unstaged or committed code.

Read `CLAUDE.md` (if present) for project conventions, and open any changed file
when you need surrounding context the diff alone doesn't show. This is a
Node.js/Express + SQLite project tested with Jest.

Check each changed line against:

1. **Style** — Naming, formatting, and structure match the conventions in
   `CLAUDE.md` and the surrounding code (e.g. camelCase functions, consistent
   error shapes, route/handler layout). Flag deviations, not personal taste.
2. **Error handling** — Every `async` function and Promise chain handles
   rejection (try/catch, `.catch`, or an Express error path). Flag unhandled
   awaits, swallowed errors (empty catch), and missing input validation on
   route handlers.
3. **Tests** — New or changed behavior has corresponding Jest tests under
   `/tests`. Flag new exported functions, routes, or branches with no test, and
   note which case is missing (happy path / validation error / edge case).
4. **Security** — No hardcoded secrets, tokens, or credentials. No string-
   concatenated/interpolated SQL (require parameterized queries). Also flag
   logged secrets and missing auth checks on mutating routes.

## Output format

Output a **numbered list**, ordered most to least severe. For each finding:

- **[CATEGORY] severity** — `path/to/file.js:LINE` — what is wrong and why it
  matters, then a concrete fix (a corrected snippet when it helps).

Severity is one of 🔴 blocker / 🟡 should-fix / 🔵 nit. Cite a real line number
from the diff for every finding — no vague "somewhere in this file".

If a category is clean, say so in one line (e.g. "Security: no issues found").
End with a one-line verdict: **Safe to commit** or **Changes requested**.
Report only real issues — do not invent findings to fill the list.
