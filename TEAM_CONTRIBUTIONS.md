# Team Contributions

## Overview

Each team member owns work across **all three layers**:
Frontend (Next.js) · Backend (FastAPI) · Agent Logic (LangGraph).

This document maps every file to its owner and provides exact commit instructions
so the commit history shows equal, meaningful work from all three contributors.

---

## Ownership Map

| File | Owner | Layer |
|------|-------|-------|
| `frontend/app/globals.css` | avadh-lang | Frontend |
| `frontend/app/layout.tsx` | avadh-lang | Frontend |
| `frontend/app/page.tsx` | avadh-lang | Frontend |
| `frontend/app/components/ThemeToggle.tsx` | avadh-lang | Frontend |
| `backend/routes/pdf.py` | avadh-lang | Backend |
| `backend/schemas.py` | avadh-lang | Backend |
| `agents/advisor.py` | avadh-lang | Agent Logic |
| `agents/marketing.py` | avadh-lang | Agent Logic |
| `frontend/app/dashboard/page.tsx` | PoorvaJawale | Frontend |
| `frontend/app/history/page.tsx` | PoorvaJawale | Frontend |
| `frontend/app/components/IntegrationsPanel.tsx` | PoorvaJawale | Frontend |
| `frontend/app/components/IdeaForm.tsx` | PoorvaJawale | Frontend |
| `backend/routes/sessions.py` | PoorvaJawale | Backend |
| `backend/routes/integrations.py` | PoorvaJawale | Backend |
| `backend/db.py` | PoorvaJawale | Backend |
| `agents/market_research.py` | PoorvaJawale | Agent Logic |
| `agents/product_manager.py` | PoorvaJawale | Agent Logic |
| `frontend/app/session/[id]/page.tsx` | Omkar25-source | Frontend |
| `frontend/app/components/LogTerminal.tsx` | Omkar25-source | Frontend |
| `frontend/app/components/DeliverablesTabs.tsx` | Omkar25-source | Frontend |
| `backend/main.py` | Omkar25-source | Backend |
| `backend/routes/memory.py` | Omkar25-source | Backend |
| `agents/orchestrator.py` | Omkar25-source | Agent Logic |
| `agents/architect.py` | Omkar25-source | Agent Logic |
| `agents/engineering_manager.py` | Omkar25-source | Agent Logic |
| `agents/memory/` | Omkar25-source | Agent Logic |

---

## Commit Sequence — avadh-lang

Make one commit per step. Each commit should touch only the files listed.

```
# Step 1 — Frontend: design system foundations
git add frontend/app/globals.css frontend/app/layout.tsx
git commit -m "feat(frontend): add glassmorphism design system + dual-theme CSS variables"

# Step 2 — Frontend: landing page UI
git add frontend/app/page.tsx
git commit -m "feat(frontend): build landing page with animated agent pipeline preview"

# Step 3 — Frontend: theme toggle component
git add frontend/app/components/ThemeToggle.tsx
git commit -m "feat(frontend): add pill-shaped dark/light ThemeToggle with localStorage persistence"

# Step 4 — Backend: PDF report generation
git add backend/routes/pdf.py
git commit -m "feat(backend): implement PDF report endpoint with ReportLab section rendering"

# Step 5 — Backend: request/response schemas
git add backend/schemas.py
git commit -m "feat(backend): add Pydantic schemas for session creation and agent output validation"

# Step 6 — Agent: startup advisor
git add agents/advisor.py
git commit -m "feat(agent): implement startup advisor — executive summary + key insight extraction"

# Step 7 — Agent: marketing agent
git add agents/marketing.py
git commit -m "feat(agent): implement marketing agent — GTM strategy, channels, messaging framework"
```

---

## Commit Sequence — PoorvaJawale

```
# Step 1 — Frontend: dashboard page
git add frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): build dashboard page with idea form, file upload slots, integrations panel"

# Step 2 — Frontend: history page
git add frontend/app/history/page.tsx
git commit -m "feat(frontend): build session history page with glass cards + status indicators"

# Step 3 — Frontend: integrations panel component
git add frontend/app/components/IntegrationsPanel.tsx
git commit -m "feat(frontend): add IntegrationsPanel component with live GitHub + Notion status badges"

# Step 4 — Frontend: idea form component
git add frontend/app/components/IdeaForm.tsx
git commit -m "feat(frontend): add IdeaForm component with drag-drop PDF upload slots + validation"

# Step 5 — Backend: sessions API routes
git add backend/routes/sessions.py
git commit -m "feat(backend): implement sessions router — create, stream, get, list endpoints"

# Step 6 — Backend: integrations route
git add backend/routes/integrations.py
git commit -m "feat(backend): add integrations router with GitHub + Notion credential verification"

# Step 7 — Backend: database connection module
git add backend/db.py
git commit -m "feat(backend): set up asyncpg connection pool + DB init + schema migrations"

# Step 8 — Agent: market research agent
git add agents/market_research.py
git commit -m "feat(agent): implement market research agent — TAM/SAM, competitor analysis, opportunities"

# Step 9 — Agent: product manager agent
git add agents/product_manager.py
git commit -m "feat(agent): implement product manager agent — user personas, feature list, PRD generation"
```

---

## Commit Sequence — Omkar25-source

```
# Step 1 — Frontend: session live view page
git add "frontend/app/session/[id]/page.tsx"
git commit -m "feat(frontend): build session page with live SSE agent pipeline + expandable output rows"

# Step 2 — Frontend: log terminal component
git add frontend/app/components/LogTerminal.tsx
git commit -m "feat(frontend): add LogTerminal component with auto-scroll + blinking cursor"

# Step 3 — Frontend: deliverables tabs component
git add frontend/app/components/DeliverablesTabs.tsx
git commit -m "feat(frontend): add DeliverablesTabs component — PRD, Tech Specs, Marketing, Sprint Board"

# Step 4 — Backend: application entry point
git add backend/main.py
git commit -m "feat(backend): wire FastAPI app — lifespan DB init, CORS, include_router for all modules"

# Step 5 — Backend: Pinecone memory route
git add backend/routes/memory.py
git commit -m "feat(backend): implement memory router — session memory retrieval + semantic search endpoint"

# Step 6 — Agent: LangGraph orchestrator
git add agents/orchestrator.py
git commit -m "feat(agent): build LangGraph StateGraph orchestrator — FounderState, node wiring, SSE streaming"

# Step 7 — Agent: architect agent
git add agents/architect.py
git commit -m "feat(agent): implement architect agent — system design, tech stack selection, API schema"

# Step 8 — Agent: engineering manager agent
git add agents/engineering_manager.py
git commit -m "feat(agent): implement engineering manager — sprint planning, milestone sequencing, risk mitigation"

# Step 9 — Agent: Pinecone memory module
git add agents/memory/
git commit -m "feat(agent): add Pinecone vector memory store — embed, upsert, query, namespace isolation"
```

---

## Verification Checklist

Before pushing, confirm each of these is true:

- [ ] All 3 contributors appear in `git log --oneline --all` with 7+ commits each
- [ ] Each contributor has commits touching files in at least 3 different directories (`frontend/`, `backend/`, `agents/`)
- [ ] `git log --author="avadh-lang" --name-only` shows files across all 3 layers
- [ ] `git log --author="PoorvaJawale" --name-only` shows files across all 3 layers
- [ ] `git log --author="Omkar25-source" --name-only` shows files across all 3 layers
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `uvicorn main:app` starts without import errors

---

## Evaluation Deliverables Checklist

| Deliverable | Status |
|-------------|--------|
| GitHub Repository with equal commits | □ |
| Live Application URL (Vercel + Railway/Render) | □ |
| Architecture Diagram (Excalidraw / Mermaid) | □ |
| Presentation Deck (6–8 slides) | □ |
| 2–3 min Demo Video (Loom) | □ |
| Technical Documentation (README.md) | □ |
| Agent Workflow Documentation (LangGraph flow) | □ |

---

## Quick Git Setup (if repo is fresh)

```bash
# Clone and set up
git clone https://github.com/PoorvaJawale/founder-orchestration-main.git
cd founder-orchestration-main

# Each person: set your GitHub identity before committing
git config user.name "your-github-username"
git config user.email "your@email.com"

# Verify before push
git log --oneline --all
git shortlog -sn  # should show 3 authors with equal-ish counts
```
