"""Main web server: farmer app + judge console + agent API + mock portal.

Run:  uvicorn server:app --port 8000      then open http://localhost:8000

The mock portal is mounted at /portal. The agent talks to it over HTTP, exactly
as it would talk to a real external portal.

On Vercel (serverless, env VERCEL=1) there is no fixed port and memory lives per
instance, so the agent calls the portal IN-PROCESS (same instance, same database)
and everything is initialised when the module is imported.
"""
import os
from contextlib import asynccontextmanager
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import voice
from agent.approvals import ApprovalError
from agent.planner import Agent, UnknownSession
from agent.scenarios import SCENARIOS, run_all
from agent.tools import PortalClient
from farmer import accounts, routes as farmer_routes
from portal import db
from portal.app import app as portal_app

voice.load_env_file()   # reads the gitignored .env (VOICE_PROVIDER, VERBX_API_KEY)

PORT = int(os.getenv("PORT", "8000"))
PORTAL_URL = os.getenv("PORTAL_URL", f"http://127.0.0.1:{PORT}/portal")
# Serve the kisan_inssurance frontend (HTML/CSS/JS) from the project root.
# The minimal kisan-claim-mitra "web/" directory is kept for console.js (loaded by console.html).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = BASE_DIR           # project root contains the polished HTML pages
SERVERLESS = bool(os.getenv("VERCEL"))      # Vercel sets VERCEL=1

STATE = {}


def configure(http):
    """Point the agent at a portal. Tests pass an in-process client here."""
    STATE["http"] = http
    STATE["agent"] = Agent(PortalClient(http))
    farmer_routes.EVIDENCE["log"] = STATE["agent"].evidence   # one shared evidence log


def portal_http():
    """HTTP client for the mock portal: real HTTP locally, in-process on serverless."""
    if SERVERLESS:
        from fastapi.testclient import TestClient
        return TestClient(portal_app, raise_server_exceptions=False)
    return httpx.Client(base_url=PORTAL_URL)


def init_all():
    db.init_db(os.getenv("PORTAL_DB"))      # mounted apps don't run their own startup
    accounts.init_db()                      # demo farmer + synthetic sample documents
    if "agent" not in STATE:
        configure(portal_http())


@asynccontextmanager
async def lifespan(app):
    if not (SERVERLESS and "agent" in STATE):   # serverless already initialised on import
        init_all()
    yield


app = FastAPI(title="Kisan Claim Mitra", lifespan=lifespan)
app.mount("/portal", portal_app)
app.include_router(farmer_routes.router)
app.add_exception_handler(accounts.AccountError, farmer_routes.account_error_handler)
if SERVERLESS:          # a function instance may start without a lifespan event
    init_all()


def agent():
    return STATE["agent"]


@app.exception_handler(ApprovalError)
async def approval_error(request: Request, exc: ApprovalError):
    return JSONResponse(status_code=403, content={"error": "approval_rule", "message": str(exc)})


@app.exception_handler(UnknownSession)
async def unknown_session(request: Request, exc: UnknownSession):
    return JSONResponse(status_code=404, content={"error": "unknown_session", "message": str(exc)})


# ---------- farmer API ----------

class NewSession(BaseModel):
    lang: str = "hi"


class ChatIn(BaseModel):
    session_id: str
    text: str
    lang: Optional[str] = None


class DecisionIn(BaseModel):
    session_id: str
    proposal_id: str
    approve: bool


@app.post("/api/session")
def new_session(body: NewSession):
    return {"session_id": agent().new_session(body.lang), "voice": voice.public_config()}


@app.post("/api/chat")
def chat(body: ChatIn):
    if len(body.text) > 500:
        raise HTTPException(422, "text too long")
    return agent().handle(body.session_id, body.text, body.lang)


@app.post("/api/approve")
def approve(body: DecisionIn):
    return agent().decide(body.session_id, body.proposal_id, body.approve)


# ---------- voice ----------

@app.get("/api/voice/config")
def voice_config():
    return voice.public_config()


class TtsIn(BaseModel):
    text: str
    lang: str = "hi"


@app.post("/api/voice/tts")
def voice_tts(body: TtsIn):
    """Only used when VOICE_PROVIDER=verbx. Any failure -> 503 -> browser falls back."""
    if voice.provider_name() != "verbx":
        raise HTTPException(409, "voice provider is browser")
    try:
        audio = voice.VerbXProvider().synthesize(body.text, body.lang)
    except voice.VoiceProviderError as exc:
        raise HTTPException(503, str(exc))
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/voice/stt")
async def voice_stt(request: Request, lang: str = "hi"):
    if voice.provider_name() != "verbx":
        raise HTTPException(409, "voice provider is browser")
    try:
        text = voice.VerbXProvider().transcribe(await request.body(), lang)
    except voice.VoiceProviderError as exc:
        raise HTTPException(503, str(exc))
    return {"text": text}


# ---------- judge console ----------

@app.get("/api/evidence")
def evidence(session_id: Optional[str] = None, limit: int = 300):
    log = agent().evidence
    entries = log.for_session(session_id) if session_id else log.entries
    return {"entries": entries[-limit:]}


@app.get("/api/agents")
def agents_roster():
    """The multi-agent system: orchestrator + specialist agents and what each can be asked."""
    a = agent()
    return {"orchestrator": {"name": a.name, "role": a.role}, "agents": a.bus.roster()}


@app.get("/api/agents/messages")
def agent_messages(session_id: Optional[str] = None, limit: int = 300):
    """The agents' conversation on the message bus (requests and replies)."""
    bus = agent().bus
    msgs = bus.for_session(session_id) if session_id else bus.transcript
    return {"messages": msgs[-limit:]}


@app.get("/api/scenarios")
def scenarios():
    return {"scenarios": [{k: s[k] for k in ("id", "title", "expected", "official")} for s in SCENARIOS]}


class RunIn(BaseModel):
    ids: Optional[List[str]] = None


@app.post("/api/scenarios/run")
def run_scenarios(body: RunIn):
    """Runs real scenarios against the mock portal (this resets the portal)."""
    return {"results": run_all(STATE["http"], only=body.ids)}



@app.get("/health", tags=["System"])
def health_check():
    """Health check — returns API status. Used by monitoring and browser tests."""
    from datetime import datetime, timezone
    return {"status": "healthy", "service": "Kisan Insurance Unified API", "version": "2.0.0", "timestamp": datetime.now(timezone.utc).isoformat()}
# ---------- bridge endpoints: dashboard-compatible claim reads ----------

from portal import db as portal_db
from agent import rules as agent_rules


@app.get("/api/claims/")
def list_claims():
    """List all portal claims (for manual-entry quick-fill)."""
    with portal_db._lock:
        rows = portal_db._conn.execute(
            "SELECT app_no, farmer_name, claim_status, crop, season FROM claims"
        ).fetchall()
    return {"success": True, "data": [dict(r) for r in rows]}


@app.get("/api/claims/{app_no}")
def get_claim_for_dashboard(app_no: str):
    """Bridge: reads the mock portal and returns dashboard-compatible JSON.

    Preserves ALL correctness rules:
    - approved â‰  paid  (payment_status 'not_credited' â†’ 'Not Credited', never 'Paid')
    - UNCERTAIN if payment_status is None or contradictory
    - exact missing document names from portal (never invented)
    - source URL and fetched_at included for TC1 traceability check
    """
    from datetime import datetime, timezone

    claim = portal_db.get_claim(app_no)
    if claim is None:
        raise HTTPException(404, f"No claim found for application number {app_no}")

    assessment = agent_rules.assess_claim(claim)

    # Map portal claim_status to 6-stage dashboard timeline
    STATUS_STAGE_MAP = {
        "under_review": 2,
        "documents_pending": 3,
        "approved": 5,
        "rejected": 4,
    }
    current_stage = STATUS_STAGE_MAP.get(claim["claim_status"], 2)

    STAGE_NAMES = [
        "Application Received",
        "Initial Verification",
        "Document Review",
        "Field Verification",
        "Approval",
        "Payment Processing",
    ]

    # Build activities for the 6-step timeline
    activities = []
    for i, name in enumerate(STAGE_NAMES, 1):
        if claim["claim_status"] == "rejected" and i == current_stage:
            status = "Failed"
        elif i < current_stage:
            status = "Completed"
        elif i == current_stage:
            status = "In Progress"
        else:
            status = "Pending"
        activities.append({
            "stage_number": i,
            "stage_name": name,
            "status": status,
            "notes": "",
            "created_at": claim.get("updated_at"),
        })

    # Build document list â€” exact names from portal, never invented
    missing = claim.get("missing_documents", [])
    submitted = claim.get("submitted_documents", [])
    documents = []
    for doc_name in missing:
        documents.append({
            "document_type": doc_name,
            "status": "Missing",
            "file_name": None,
            "uploaded_at": None,
        })
    for s in submitted:
        documents.append({
            "document_type": s.get("document_name"),
            "status": "Submitted",
            "file_name": s.get("file_ref"),
            "uploaded_at": claim.get("updated_at"),
        })

    # Payment status â€” NEVER say Paid unless portal says credited
    payment_display_map = {"credited": "Paid", "not_credited": "Not Credited"}
    payment_status = payment_display_map.get(claim.get("payment_status"), "Unknown")

    # Claim status display
    status_display_map = {
        "under_review": "Under Review",
        "documents_pending": "Documents Pending",
        "approved": "Approved",
        "rejected": "Rejected",
    }

    source_url = f"/portal/claims/{app_no}"
    fetched_at = datetime.now(timezone.utc).isoformat()

    return {
        "success": True,
        "message": "Claim retrieved successfully",
        "data": {
            "application_number": claim["app_no"],
            "farmer_name": claim.get("farmer_name", ""),
            "crop": claim.get("crop", ""),
            "season": claim.get("season", ""),
            "year": claim.get("season", "2026")[-4:] if claim.get("season") else "2026",
            "claim_status": status_display_map.get(claim["claim_status"], claim["claim_status"]),
            "payment_status": payment_status,
            "current_stage": current_stage,
            "completion_percentage": round((current_stage / 6) * 100),
            "missing_documents_count": len(missing),
            "documents": documents,
            "activities": activities,
            "district": claim.get("district", ""),
            "assessment": assessment,
            "record_version": claim.get("record_version"),
            "source_url": source_url,
            "fetched_at": fetched_at,
            "created_at": claim.get("updated_at"),
            "updated_at": claim.get("updated_at"),
            "action_needed": len(missing) > 0,
            "appeal_possible": claim["claim_status"] == "rejected",
            "rejection_reason": "Claim rejected" if claim["claim_status"] == "rejected" else None,
            "claim_amount": None,
            "sum_insured": None,
        },
    }



@app.get("/api/doc-samples")
def doc_samples():
    """List available synthetic document sample images for the UI."""
    return {"samples": [
        {"doc_type": "land_record", "portal_name": "Land Record (Khatauni)", "file": "web/samples/land_record_sample.png", "label_en": "Land Record sample", "label_hi": "भूमि रिकॉर्ड नमूना"},
        {"doc_type": "aadhaar_card", "portal_name": "Aadhaar Card", "file": "web/samples/aadhaar_card_sample.png", "label_en": "Aadhaar Card sample", "label_hi": "आधार कार्ड नमूना"},
        {"doc_type": "bank_passbook", "portal_name": "Bank Passbook", "file": "web/samples/bank_passbook_sample.png", "label_en": "Bank Passbook sample", "label_hi": "बैंक पासबुक नमूना"},
        {"doc_type": "insurance_papers", "portal_name": "Insurance Papers", "file": "web/samples/insurance_papers_sample.png", "label_en": "Insurance Papers sample", "label_hi": "बीमा पॉलिसी नमूना"},
    ]}
# ---------- static web app (mounted last so /api and /portal win) ----------
# Serve the polished kisan_inssurance frontend from the project root.
# css/, js/, assets/ are sub-directories discovered automatically via html=True.
app.mount("/web", StaticFiles(directory=os.path.join(BASE_DIR, "web"), html=True), name="web_legacy")
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="frontend")


