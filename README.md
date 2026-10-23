# Kisan Insurance - Unified Crop Claim Tracker

A complete crop insurance claim tracking system combining:
- **Polished frontend** (5 HTML pages, 6-language TTS/STT, Poppins/green UI)
- **Multi-agent backend** (orchestrator + 7 specialist agents, trained NLU, mock portal)

## Quick Start

```bash
cd c:\Users\japka\OneDrive\Desktop\kisan_inssurance
pip install -r requirements.txt
python -m uvicorn server:app --port 8000
```

Open **http://localhost:8000**

## Test Cases (all passing)

Run `python run_tests.py` -- all 13/13 pass, writes TEST_EVIDENCE.md.

| Case | App Number | Expected |
|------|-----------|---------|
| TC1 | KRB-2026-00417 | Status read in farmer's language |
| TC2 | KRB-2026-00521 | Missing doc named exactly: "Land Record (Khatauni)" |
| TC3 | KRB-2026-00633 | Season corrected (Kharif 2026 -> Rabi 2026-27) |
| TC4 | KRB-2026-00748 | Approved != paid until credit shows |

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page (auth guard -> auth.html) |
| `/auth.html` | Sign in / sign up with mock OTP (shown, never bypassed) |
| `/manual-entry.html` | Form entry with TC quick-fill buttons |
| `/voice-input.html` | 6-language voice input via Web Speech API |
| `/dashboard.html` | Claim status, timeline, documents, approval panel, agent bar |
| `/console.html` | Judge console -- run TCs, view evidence log |

## Architecture

```
Frontend (kisan_inssurance)    Backend (kisan-claim-mitra)
--------------------------     --------------------------
auth.html          ---------> /api/auth/signup | otp | verify
voice-input.html   ---------> /api/session + /api/chat  ----> Multi-Agent Orchestrator
manual-entry.html  ---------> /api/session + /api/chat       +- IntakeAgent (NLU)
dashboard.html     ---------> /api/claims/{app_no}  --------> Mock Portal /portal
                   ---------> /api/chat (conversation bar)   +- InvestigatorAgent
                   ---------> /api/approve (approval panel)  +- ActionAgent (idempotent)
console.html       ---------> /api/scenarios/run             +- VerifierAgent (checker)
                              /api/evidence                   +- AuditorAgent (log)
```

## Correctness Rules

- **Approved != Paid**: "paid" only when portal `payment_status == "credited"`
- **UNCERTAIN**: never guesses when data is missing or contradictory
- **Exact doc names**: portal strings verbatim, never invented
- **Human approval before any write**: no change without farmer clicking Approve
- **Independent verification**: VerifierAgent re-reads portal after every write
- **Portal down != not found**: different error messages, never confused
- **OTP safety**: demo OTP shown in yellow box, farmer must type it, never bypassed

## Key Files

```
server.py              -- Unified FastAPI server
requirements.txt       -- Python dependencies
run_tests.py           -- Run TC1-TC4 + F1-F9 scenarios
TEST_EVIDENCE.md       -- Last test run results
DEMO_SCRIPT.md         -- Step-by-step demo guide
agent/                 -- Multi-agent system (planner, NLU, rules, approvals)
portal/                -- Mock insurance portal with failure modes
farmer/                -- Auth, OTP, document checks
js/config.js           -- Shared API_BASE
js/dashboard.js        -- Dashboard + approval panel + conversation bar
js/voice-recognition.js -- Agent-powered voice input
js/manual-entry.js     -- Agent-powered form entry
css/dashboard.css      -- All styles including new components
```
