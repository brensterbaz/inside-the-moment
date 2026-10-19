# Repository and Azure Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Publish the existing source safely and establish the account, funding and technical requirements for the first Azure integration.

**Architecture:** Keep the deterministic static replay intact. The proposed next milestone adds an Azure Functions boundary around evidence construction and a Foundry model; provider credentials remain on the server. This readiness task creates no Azure resources and makes no inference calls.

**Tech Stack:** Existing TypeScript/Vite/Three.js/Vitest app, Git, GitHub CLI and official Microsoft Azure documentation.

---

The referenced execution sub-skills are not installed. Execute this bounded repository/readiness task inline under the user's authorisation. The workspace began without a Git repository, so bootstrap it in the requested directory; no separate agent or worktree is needed for this task.

## Task 1: Prepare and publish the existing source

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`
- Preserve locally: `.env.local`, `.vercel/`, `docs/source/SHARED_CHAT.md`

- [x] Exclude environment files, hosting settings, generated builds, dependencies, private-key files and the imported conversation. Retain the public briefs and third-party notices.
- [x] Initialise Git and stage the intended source:

```sh
git init -b main
git add .
git check-ignore .env.local .vercel/project.json node_modules dist docs/source/SHARED_CHAT.md
git diff --cached --stat
```

Expected: the five private/generated paths are ignored and the initial payload contains 30 source/documentation files.

- [x] Scan the staged text files for common provider tokens, assigned secrets and private-key headers, reporting paths and rule names only. Resolve every match before publication. Initial scan returned zero matches; this is a pattern-based check, not proof that all possible secrets are detectable.
- [x] Publish the initial source:

```sh
git commit -m 'Initial playable Inside the Moment replay'
gh repo create brensterbaz/inside-the-moment --public --source . --remote origin --push --description 'Evidence-grounded football replay for Meta Quest 2 and desktop, built with Three.js and WebXR.'
```

- [x] Verify public visibility, default branch and remote commit:

```sh
gh repo view brensterbaz/inside-the-moment --json nameWithOwner,url,visibility,defaultBranchRef
git ls-remote origin refs/heads/main
git rev-parse HEAD
```

Expected: `PUBLIC`, default branch `main`, and matching local/remote commit SHAs.

## Task 2: Establish the Azure gate and implementation route

**Files:**
- Create: `docs/AZURE_INTEGRATION.md`
- Modify: `README.md`, `AGENTS.md`, `docs/DEPLOYMENT.md`, `docs/HACKATHON.md`

- [x] Ask whether hackathon credits are confirmed; keep provisioning and model calls disabled without that information. User answered that credits are not yet available or are uncertain.
- [x] Inspect the personal Azure subscription list read-only; do not enter billing details, start a subscription, change directories into an employer account or activate resources. Keep private account details out of the public repository.
- [x] Read the official Microsoft references listed in `docs/AZURE_INTEGRATION.md`. Confirm the current v1 model API, structured outputs, Functions v4 and server-side authentication approach.
- [x] Record the concrete first milestone, resource purposes, request/evidence contract, planned file responsibilities, replay invariants and verification gates in `docs/AZURE_INTEGRATION.md`.
- [x] Update project status to identify the public repository accurately and preserve the unconfirmed funding and untested hardware boundaries.

## Task 3: Verify and hand off the funding dependency

- [x] Confirm the six replay tests and TypeScript/Vite production build pass on the current source.
- [x] Commit and push the documentation; verify remote/local SHAs and a clean worktree.
- [x] Report the public repository, proposed Azure approach and the subscription/credits dependency. Do not describe the readiness documentation as a connected Azure implementation.

## Scope check

Repository publication is complete. Azure design and access investigation are complete for the currently available account/funding information. Implementation, paid provisioning, real provider tests, voice integration, a new frontend deployment and hackathon submission remain separate milestones. They are not marked complete by this plan.
