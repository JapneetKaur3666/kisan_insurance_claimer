# Kisan Insurance -- Crop Claim Tracker
## Project Presentation

---

## Slide 1 -- Title

# Kisan Insurance
## AI-Powered Crop Claim Tracker

**For Indian Farmers -- In Their Language**

> Just tell me your application number. I will do the rest.

- Voice + Text input
- Hindi and English
- Multi-Agent AI backend
- 13/13 test cases passing

---

## Slide 2 -- The Problem

### What Indian Farmers Face Today

| Pain Point | Reality |
|---|---|
| Cannot track claim status | Have to visit office or call helpline |
| Do not know why payment has not come | Approved looks same as Paid to them |
| Do not know which exact document is needed | Portal gives a code, not a plain name |
| Cannot navigate complex portals | Low literacy, small phones |
| Speak Hindi, portals speak bureaucratic English | Language barrier |

### The Gap
> A farmer claim was **approved months ago** but he does not know the money has not been credited yet.
> He keeps calling the helpline saying my claim passed, where is my money?

---

## Slide 3 -- Our Solution

### Kisan Insurance Crop Claim Tracker

**One sentence**: A voice-first AI agent that helps farmers check, understand, and fix their crop
insurance claims -- in Hindi -- without needing to visit anyone.

Flow:
1. Farmer speaks in Hindi
2. Agent listens, understands, reads portal
3. Tells farmer: claim status and payment state in plain language
4. If document missing -> shows sample image -> farmer uploads -> agent checks quality
5. Agent proposes -> farmer approves -> portal updated -> VERIFIED

---

## Slide 4 -- Live Demo Flow

### What the judge sees:

1. Sign in (demo mobile: 9876543210, OTP shown in yellow)
2. Click TC2: Missing Doc (quick-fill button)
3. Dashboard auto-speaks: You have 1 missing document. Number 1: Land Record (Khatauni).
4. Document card shows sample image (tap to expand)
5. Click Upload -> modal shows how it should look
6. Conversation bar: kaun sa kagaz baaki hai
7. Agent proposes upload -> Approval Panel appears
8. Click Approve -> VERIFIED -> document clears
9. Switch to Hindi -> everything re-renders in Hindi

### TC4 (approved != paid):
- Open KRB-2026-00748
- Amber warning banner: Approved -- payment NOT yet credited
- Ask: kya paisa aaya?
- Agent: Aapka claim manzoor ho gaya hai lekin abhi tak paisa aapke khate mein nahin aaya hai.

---

## Slide 5 -- Architecture

    +------------------------------------------+
    |            FARMER PHONE                  |
    |  Voice -> Web Speech API -> Transcript   |
    |  Text -> Conversation bar                |
    |  Dashboard -> auto-speaks status         |
    +----------------+--------------------------+
                     | HTTP
    +----------------v--------------------------+
    |         FastAPI Server                   |
    |                                          |
    |  /api/chat --> Orchestrator Agent        |
    |                    |                     |
    |          +---------+---------+           |
    |      Intake   Investigator  Action       |
    |      (NLU)   (portal read) (write+lock)  |
    |                    |         |           |
    |                Verifier   Auditor        |
    |              (re-reads)  (logs)          |
    |                                          |
    |  /portal/ --> Mock Insurance Portal      |
    |               (SQLite * 5 seed claims)   |
    +------------------------------------------+

---

## Slide 6 -- Multi-Agent System

### 8 Agents, One Bus

| Agent | Job |
|---|---|
| **Orchestrator** | State machine: COLLECT->FETCH->DECIDE->PROPOSE->APPROVE->EXECUTE->VERIFY->RESPOND |
| **Intake** | NLU: intent + entities from text |
| **Investigator** | Reads portal, applies business rules |
| **Action** | Creates proposals; enforces approval; executes exactly once |
| **Verifier** | Re-reads portal independently after every write (maker-checker) |
| **Responder** | Builds Hindi/English reply from fixed templates |
| **Auditor** | Logs everything; scrubs secrets (OTP, token, Aadhaar) |
| **Helpdesk** | Books synthetic callback with officer |

> **Key design**: agents talk ONLY via MessageBus. No agent calls another directly.
> Every message is recorded for the judge console.

---

## Slide 7 -- NLU (No LLM, No API Key)

### Trained from scratch with scikit-learn

    2,035 utterances -> TF-IDF (char n-grams 2-5) -> Logistic Regression
    Accuracy: 99.5% (held-out split) / 96.7% (30 hand-written realistic sentences)

### 11 Intents
check_status / missing_docs / correct_season / upload_doc /
apply_insurance / book_help / approve / reject / repeat / greet / unknown

### 3 Languages: English / Hindi (Devanagari) / Hinglish (Hindi in Latin script)

### No API key. No internet. Runs fully offline.

---

## Slide 8 -- Business Rules (The Hard Part)

### Rule 1: Approved != Paid
    claim_status = approved  AND  payment_status = not_credited
    -> Agent says: Approved but NOT credited
    -> NEVER says paid until payment_status = credited

### Rule 2: UNCERTAIN -- Never Guess
    payment_status = NULL  ->  UNCERTAIN
    I cannot confirm. I will not guess.

### Rule 3: Exact Document Names
    Portal says: Land Record (Khatauni)
    Agent says:  Land Record (Khatauni)
    Never:       Land certificate or Khatauni document

### Rule 4: Human Approval Before Any Write
    Agent PROPOSES -> Farmer APPROVES -> Agent EXECUTES -> Agent VERIFIES
    Nothing changes until the farmer clicks Approve

### Rule 5: Independent Verification
    After every write: VerifierAgent re-reads portal from scratch
    If portal shows the change -> VERIFIED
    If portal does not show it  -> FAILED (catches drop_writes failure mode)

---

## Slide 9 -- Voice Features

### Input
- **Continuous listening** -- does not stop on first pause
- **2.5-second silence timer** -- auto-stops when farmer finishes
- **Hindi normalization:** spoken KRB to KRB-YYYY-NNNNN, Devanagari to ASCII
- **Edit with mic** -- tap Edit -> text area + inline mic button

### Output (Auto-speaks everything)
    Aapka claim manzoor ho gaya hai lekin abhi tak paisa
    aapke khate mein nahin aaya hai. Manzuri ka matlab hai
    bima company ne daawa sweekar kiya hai, lekin bank
    transfer hone mein thoda samay aur lagega.

---

## Slide 10 -- Document Upload Flow

    Portal: missing_documents = [Land Record (Khatauni)]
    Dashboard shows document card with sample thumbnail
    Click Upload -> Modal opens with how-it-should-look image
    Agent proposes -> Approval Panel: Shall I upload this document?
    Portal unchanged until Approve is clicked
    After Approve -> Execute -> Verify -> VERIFIED
    Agent speaks: Document submitted and verified.

---

## Slide 11 -- Safety Guardrails

| Guardrail | Implementation |
|---|---|
| No change without approval | Server enforces -- browser cannot bypass |
| No double-write | Idempotency key on every portal call |
| No stale update | record_version check (optimistic lock) |
| Timeout recovery | Re-read portal before retry |
| Fake credit protection | Payment = PAID only when portal says credited |
| OTP security | HMAC constant-time, TTL, cooldown, max attempts |
| Audit trail | Every step logged; secrets scrubbed |
| Portal down != not found | Different error, different message |

---

## Slide 12 -- Test Results

    python run_tests.py

    TC1  PASS  Valid application under review (English)
    TC2  PASS  Missing document named exactly; upload with approval (Hindi)
    TC3  PASS  Season mismatch: farmer says Rabi 2026-27 (Hinglish)
    TC4  PASS  Approved but NOT paid (English)

    F1-F9  PASS  All failure scenarios pass

    13 / 13  PASS   (+ 113 pytest unit tests)

---

## Slide 13 -- Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.11 |
| Agent intelligence | 8-agent system over MessageBus |
| NLU | scikit-learn TF-IDF + LogReg (no LLM) |
| Portal simulation | SQLite in-memory + failure modes |
| Doc quality | OpenCV + NumPy |
| Frontend | HTML5 / CSS3 / Vanilla JS |
| Voice I/O | Web Speech API (browser-native) |
| Languages | English + Hindi (fully bilingual) |
| Tests | 113 pytest + 13 scenario tests |

---

## Slide 14 -- What Makes This Different

| Feature | Typical chatbot | This project |
|---|---|---|
| Approval before write | Acts immediately | Proposes + waits for farmer |
| Independent verification | Trusts own response | Re-reads portal separately |
| Approved != Paid | Often confused | Enforced at rule level |
| Document names | May invent names | Exact portal strings only |
| Idempotency | May write twice | Portal deduplicates |
| Audit trail | Black box | Every step logged, judge console |
| NLU | Requires LLM/API | Trained locally, offline |
| UNCERTAIN | Always gives answer | Says I don't know when appropriate |

---

## Slide 15 -- Run It Yourself

    cd c:\Users\japka\OneDrive\Desktop\kisan_inssurance
    pip install -r requirements.txt
    python -m uvicorn server:app --reload
    python run_tests.py

### Quick demo (no login needed):
1. manual-entry.html -> click TC4: Approved
2. console.html -> click Run all 4 tests

---

*Project: Kisan Insurance Crop Claim Tracker*
*All data is 100% synthetic. No real farmers, documents, or financial data.*