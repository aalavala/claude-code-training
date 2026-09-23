---
name: northwind-pr
description: Write the pull request description for the current branch in Northwind's required format — title, what changed, how it was verified, acceptance criteria, and what was deliberately left out. Use when the user asks to write or draft a PR description in the team format, or when /submit needs a description and this skill exists.
---

# northwind-pr

Write the pull request description for the work on this branch, in the team's required format. `/submit` calls this skill instead of the generic `.github/pull_request_template.md` fill-in whenever it exists — this is the authoritative shape.

## What to do

### 1. Gather the facts. Do not guess at them.

- `git diff main...HEAD --stat`, then the diff itself — what actually changed
- `git log main..HEAD --oneline` — how it was sequenced
- The ticket in `docs/tickets/` — the acceptance criteria, verbatim

### 2. Check each acceptance criterion honestly

Go criterion by criterion. For each one, find the code that satisfies it, or find that nothing does. If it's half done, say half done and say which half — an unmet criterion reported honestly reads better than one left unmentioned, because a reviewer finds it either way.

### 3. Write the description in this exact shape

- **Title** — `<TICKET-ID>: <what it does>`. Ticket ID from the ticket file (or the branch name); the rest a plain-language summary, not a restatement of the ticket title.
- **What changed** — one paragraph, plain language. What can the app do now that it could not do before? Not a file list — the diff already is one.
- **How I verified it** — the actual commands you ran and the actual output. "Tests pass" is weak; `npm test — 12 passing, including the Luhn generator case` is evidence. Say what you clicked and what appeared, if anything was checked by hand.
- **Acceptance criteria** — the ticket's checkboxes, ticked honestly. Where one is partial, tick or don't and add a one-line note on what's missing.
- **Deliberately not done** — anything out of scope, deferred, or left for a follow-up ticket. Distinct from an unmet acceptance criterion: this is what you chose not to build, not what you tried and fell short of.

### 4. Offer to open it

Print the finished description. Then offer to open the PR (or update one that's already open):

```bash
gh pr create --title "<TICKET-ID>: <what it does>" --body-file <file>
# or, if a PR already exists on this branch:
gh pr edit <number> --body-file <file>
```

Ask before running it. Opening or editing a pull request is the user's call, not yours.

## Rules

- **Never claim a verification step that was not actually run.** If you did not run it, do not write that you did. This is the fastest way to lose a reviewer's trust, and the grader checks it.
- **No file list dressed up as "what changed."** Describe the capability, not the diff.
- **Say what you did not do.** Stating a limit in "Deliberately not done" is not a weakness; a reviewer discovering it themselves is.
- **Plain language over ceremony.** "Ops can now issue a card and see it in the list" beats "implemented card issuance functionality."
- **No emoji, no filler, no summary of the summary.**
