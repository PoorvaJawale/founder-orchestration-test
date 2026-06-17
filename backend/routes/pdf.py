"""
pdf.py — PDF report generation endpoint
Owner: avadh-lang

Compiles all agent outputs from a session into a structured PDF report
and returns it as a downloadable file attachment.
"""
import io
import json
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse

from db import get_pool

router = APIRouter(prefix="/api/sessions", tags=["pdf"])


@router.get("/{session_id}/pdf")
async def download_session_pdf(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Generate and stream a PDF report for the given session.

    Sections included in the report:
      1. Executive Summary (advisor agent output)
      2. Market Research (market_research agent output)
      3. Product Requirements Document (product_manager agent output)
      4. Technical Architecture (architect agent output)
      5. Go-to-Market / Marketing Plan (marketing agent output)
      6. Engineering Sprint Board (engineering_manager agent output)
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        session = await conn.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        outputs = await conn.fetch(
            "SELECT agent_name, output_json FROM agent_outputs WHERE session_id = $1",
            session_id,
        )

    outputs_by_agent: dict = {o["agent_name"]: json.loads(o["output_json"]) for o in outputs}

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, PageBreak
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise HTTPException(status_code=500, detail="reportlab not installed — run: pip install reportlab")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
    )

    base_styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=base_styles["Title"],
        fontSize=24,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    h1_style = ParagraphStyle(
        "H1",
        parent=base_styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#4c1d95"),
        spaceBefore=18,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=base_styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#5b21b6"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=base_styles["Normal"],
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#1c1917"),
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=base_styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#78716c"),
        alignment=TA_CENTER,
        spaceAfter=16,
    )

    story = []
    idea_text = (session["startup_idea"] or "")[:120].replace("&", "&amp;").replace("<", "&lt;")

    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Founder Orchestration Report", title_style))
    story.append(Paragraph(f"Idea: {idea_text}...", meta_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e9d5ff")))
    story.append(Spacer(1, 0.2 * inch))

    # Section map: (agent_name, section_title, key_paths)
    sections = [
        ("advisor",             "Executive Summary",        ["executive_summary", "key_insights", "recommendation"]),
        ("market_research",     "Market Research",          ["market_size", "competitors", "opportunities", "threats"]),
        ("product_manager",     "Product Requirements",     ["problem_statement", "features", "user_personas", "success_metrics"]),
        ("architect",           "Technical Architecture",   ["architecture_overview", "tech_stack", "system_components", "api_design"]),
        ("marketing",           "Go-to-Market Strategy",    ["positioning", "channels", "messaging", "launch_plan"]),
        ("engineering_manager", "Engineering Sprint Board", ["sprints", "milestones", "team_allocation", "risk_mitigation"]),
    ]

    for agent_name, section_title, keys in sections:
        data = outputs_by_agent.get(agent_name)
        story.append(Paragraph(section_title, h1_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#ddd6fe")))
        story.append(Spacer(1, 0.1 * inch))

        if not data:
            story.append(Paragraph("<i>No output generated for this section.</i>", body_style))
        else:
            for key in keys:
                value = data.get(key)
                if value is None:
                    continue
                label = key.replace("_", " ").title()
                story.append(Paragraph(label, h2_style))
                if isinstance(value, list):
                    for item in value:
                        text = (str(item) if not isinstance(item, dict) else json.dumps(item, indent=2))
                        text = text.replace("&", "&amp;").replace("<", "&lt;")
                        story.append(Paragraph(f"■  {text}", body_style))
                elif isinstance(value, dict):
                    for k, v in value.items():
                        v_text = str(v).replace("&", "&amp;").replace("<", "&lt;")
                        story.append(Paragraph(f"<b>{k}:</b> {v_text}", body_style))
                else:
                    text = str(value).replace("&", "&amp;").replace("<", "&lt;")
                    story.append(Paragraph(text, body_style))
                story.append(Spacer(1, 0.06 * inch))

            # Catch-all: keys not in the predefined list
            extra_keys = [k for k in data if k not in keys]
            for key in extra_keys:
                value = data[key]
                label = key.replace("_", " ").title()
                story.append(Paragraph(label, h2_style))
                text = (json.dumps(value, indent=2) if isinstance(value, (dict, list)) else str(value))
                text = text.replace("&", "&amp;").replace("<", "&lt;")
                story.append(Paragraph(text, body_style))
                story.append(Spacer(1, 0.06 * inch))

        story.append(PageBreak())

    doc.build(story)
    buf.seek(0)

    safe_id = session_id[:8]
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="founder-report-{safe_id}.pdf"'},
    )
