import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse

from db import get_pool, init_db, close_pool
from orchestrator import run_orchestration_stream
from tools.pdf_tools import extract_pdf_text, generate_report_pdf
from tools.file_tool import process_uploaded_document
from tools.integrations import verify_github, verify_notion


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_pool()

app = FastAPI(title="AI Founder Orchestration API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_user_id(authorization: Optional[str]) -> str:
    if not authorization:
        return "demo-user"
    try:
        import base64
        token = authorization.split(" ")[1]
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.b64decode(payload_b64))
        return payload.get("sub", "demo-user")
    except Exception:
        return "demo-user"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/integrations/verify")
async def verify_integrations():
    gh_status = verify_github()
    notion_status = verify_notion()
    return {
        "github": gh_status,
        "notion": notion_status
    }


@app.post("/api/sessions")
async def create_session(
    startup_idea: str = Form(...),
    business_plan: Optional[UploadFile] = File(None),
    competitor_report: Optional[UploadFile] = File(None),
    prd_file: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
):
    user_id = get_user_id(authorization)
    idea = startup_idea.strip()
    uploaded_files_meta = []

    # Process files
    files_to_process = [
        (business_plan, "business_plan", "Business Plan"),
        (competitor_report, "competitor_report", "Competitor Report"),
        (prd_file, "prd", "PRD")
    ]

    for file_obj, category, label in files_to_process:
        if file_obj and file_obj.filename:
            file_bytes = await file_obj.read()
            processed = process_uploaded_document(file_obj.filename, file_bytes, category)
            if processed:
                uploaded_files_meta.append({
                    "name": file_obj.filename,
                    "category": category
                })
                content = processed["content"]
                idea = f"{idea}\n\nContext from uploaded {label} ({file_obj.filename}):\n{content[:2500]}"

    session_id = str(uuid.uuid4())
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (id, user_id, startup_idea, status, uploaded_files) VALUES ($1, $2, $3, 'running', $4)",
            session_id, user_id, idea[:3000], json.dumps(uploaded_files_meta),
        )

    return {"session_id": session_id}


@app.get("/api/sessions/{session_id}/stream")
async def stream_session(
    session_id: str,
    authorization: Optional[str] = Header(None),
    token: Optional[str] = None,
):
    auth_header = authorization or (f"Bearer {token}" if token else None)
    user_id = get_user_id(auth_header)

    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await conn.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    startup_idea = session["startup_idea"]
    uploaded_files_json = session["uploaded_files"]
    uploaded_files = json.loads(uploaded_files_json) if uploaded_files_json else []

    async def event_generator():
        try:
            async for event in run_orchestration_stream(session_id, user_id, startup_idea, uploaded_files):
                if event.get("event") == "log":
                    yield f"data: {json.dumps({'type': 'log', 'message': event['message']})}\n\n"

                elif event.get("event") == "agent_complete":
                    agent = event["agent"]
                    data = event["data"]

                    pool = await get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute(
                            "INSERT INTO agent_outputs (session_id, agent_name, output_json) VALUES ($1, $2, $3)",
                            session_id, agent, json.dumps(data),
                        )

                    yield f"data: {json.dumps({'type': 'agent_complete', 'agent': agent, 'label': event['label'], 'data': data})}\n\n"

                elif event.get("event") == "complete":
                    final_state = event.get("state") or {}
                    errors = final_state.get("errors", [])
                    status = "error" if errors else "complete"

                    pool = await get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute(
                            "UPDATE sessions SET status = $1 WHERE id = $2", status, session_id
                        )
                    if status == "error":
                        err_msg = errors[0].get("error", "Critical agent failure") if errors else "Unknown failure"
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Orchestration stopped: {err_msg}'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE sessions SET status = 'error' WHERE id = $1", session_id
                )
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, authorization: Optional[str] = Header(None)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await conn.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        outputs = await conn.fetch(
            "SELECT agent_name, output_json FROM agent_outputs WHERE session_id = $1", session_id
        )

    outputs_by_agent = {o["agent_name"]: json.loads(o["output_json"]) for o in outputs}
    return {
        "id": session["id"],
        "startup_idea": session["startup_idea"],
        "status": session["status"],
        "created_at": session["created_at"].isoformat(),
        "outputs": outputs_by_agent,
    }


@app.get("/api/sessions")
async def list_sessions(authorization: Optional[str] = Header(None)):
    user_id = get_user_id(authorization)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, startup_idea, status, created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
            user_id,
        )
    return [
        {"id": r["id"], "startup_idea": r["startup_idea"],
         "status": r["status"], "created_at": r["created_at"].isoformat()}
        for r in rows
    ]


@app.get("/api/sessions/{session_id}/pdf")
async def download_pdf(session_id: str, authorization: Optional[str] = Header(None)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await conn.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        outputs = await conn.fetch(
            "SELECT agent_name, output_json FROM agent_outputs WHERE session_id = $1", session_id
        )

    outputs_by_agent = {o["agent_name"]: json.loads(o["output_json"]) for o in outputs}
    report_data = {
        "startup_idea": session["startup_idea"],
        "startup_advisor":     outputs_by_agent.get("startup_advisor"),
        "market_research":     outputs_by_agent.get("market_research"),
        "product_manager":     outputs_by_agent.get("product_manager"),
        "architect":           outputs_by_agent.get("architect"),
        "engineering_manager": outputs_by_agent.get("engineering_manager"),
        "marketing":           outputs_by_agent.get("marketing"),
    }

    pdf_bytes = generate_report_pdf(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=founder-report-{session_id[:8]}.pdf"},
    )


@app.get("/api/sessions/{session_id}/memory")
async def get_session_memory(session_id: str, authorization: Optional[str] = Header(None)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM memories WHERE session_id = $1", session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found for this session")

    return {
        "session_id": row["session_id"],
        "startupName": row["startup_name"],
        "idea": row["idea"],
        "roadmaps": json.loads(row["roadmaps"]),
        "documents": json.loads(row["documents"]),
        "created_at": row["created_at"].isoformat()
    }
