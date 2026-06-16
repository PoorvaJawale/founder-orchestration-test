# AI Founder Orchestration System

Turn a raw startup idea into a complete founder package in under 5 minutes using 6 specialized AI agents.

## What it does

1. **Startup Advisor** — validates idea, identifies risks, gives recommendation
2. **Market Research** — live web search (Tavily), competitor analysis, SWOT
3. **Product Manager** — writes PRD, user stories, publishes to Notion automatically
4. **Architect** — recommends tech stack, creates GitHub repo
5. **Engineering Manager** — sprint plan, creates GitHub issues automatically
6. **Marketing** — tagline, landing page copy, GTM strategy, pricing

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js + Tailwind (Vercel) |
| Auth | Clerk |
| Backend | FastAPI (Railway) |
| Orchestration | LangGraph |
| LLM | GPT-4o |
| Web Search | Tavily API |
| GitHub | PyGithub |
| Notion | Notion API |
| Database | Supabase (PostgreSQL) |
| Vector Store | Pinecone |
| Observability | LangSmith |

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Fill in all API keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local    # Fill in Clerk keys + API URL
npm run dev
```

### Supabase

Run `backend/supabase_schema.sql` in the Supabase SQL Editor.

### Pinecone

Create an index named `founder-orchestration` with dimension `1536`, metric `cosine`, on AWS us-east-1.

### Notion

1. Create an integration at https://notion.so/my-integrations
2. Create a database page, share it with your integration
3. Copy the database ID from the URL

## Environment Variables

### Backend `.env`
```
OPENAI_API_KEY=
TAVILY_API_KEY=
GITHUB_TOKEN=
GITHUB_USERNAME=
NOTION_API_KEY=
NOTION_DATABASE_ID=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=founder-orchestration
SUPABASE_URL=
SUPABASE_KEY=
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=founder-orchestration
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local`
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

- **Frontend**: Push `frontend/` to Vercel, set env vars in Vercel dashboard
- **Backend**: Push `backend/` to Railway, set env vars in Railway dashboard

## Project Structure

```
├── backend/
│   ├── main.py                    # FastAPI app, all API routes
│   ├── orchestrator.py            # LangGraph 6-agent pipeline
│   ├── agents/
│   │   ├── advisor.py             # Agent 1
│   │   ├── market_research.py     # Agent 2 (Tavily)
│   │   ├── product_manager.py     # Agent 3 (Notion)
│   │   ├── architect.py           # Agent 4 (GitHub)
│   │   ├── engineering_manager.py # Agent 5 (GitHub Issues)
│   │   └── marketing.py           # Agent 6 (Tavily)
│   ├── tools/
│   │   ├── tavily_search.py
│   │   ├── github_tools.py
│   │   ├── notion_tools.py
│   │   └── pdf_tools.py
│   ├── memory/
│   │   └── pinecone_memory.py
│   └── supabase_schema.sql
└── frontend/
    ├── app/
    │   ├── page.tsx               # Landing page
    │   ├── dashboard/page.tsx     # Input + run
    │   ├── session/[id]/page.tsx  # Live agent progress
    │   └── history/page.tsx       # Past runs
    └── lib/api.ts                 # API client
```
