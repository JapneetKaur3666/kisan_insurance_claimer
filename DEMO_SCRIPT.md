# DEMO SCRIPT - Kisan Insurance Unified App

**Run with:**
```
cd c:\Users\japka\OneDrive\Desktop\kisan_inssurance
pip install -r requirements.txt
python -m uvicorn server:app --port 8000
```
Then open: http://localhost:8000

---

## TC1 - Application Under Review (English)

**App number:** KRB-2026-00417

**Steps:**
1. Open http://localhost:8000 - sign in or guest
2. Click "Manual Entry" - click **TC1: Under Review** quick-fill button
3. Click "Check Claim Status"
4. Dashboard loads: Under Review, Kharif 2026, Paddy
5. On conversation bar, click **Status** or type "what is my claim status"
6. Agent replies: "Application KRB-2026-00417 (Paddy, Kharif 2026): claim is Under review. Money has NOT been credited yet."

**Check:** Reply mentions source URL (/portal/claims/KRB-2026-00417) and IST fetched time.

---

## TC2 - Missing Document (Hindi)

**App number:** KRB-2026-00521

**Steps:**
1. Open http://localhost:8000 - Manual Entry - click **TC2: Missing Doc**
2. Dashboard loads: Documents Pending, missing document shown
3. Conversation bar: type "kaunsa kagaz baki hai" (or click Documents button)
4. Agent replies with EXACT document name: **Land Record (Khatauni)**
5. Approval panel appears - click "Approve"
6. Agent re-reads portal - VERIFIED shown, document clears

**Check (safety rule):** Nothing changes until you click Approve.

---

## TC3 - Season Mismatch (Hinglish)

**App number:** KRB-2026-00633

**Steps:**
1. Manual Entry - TC3: Season Fix
2. Conversation bar: type "mera rabi 2026-27 ka claim hai season galat hai"
3. Approval panel: shows **Kharif 2026 -> Rabi 2026-27** before/after
4. Click "Approve"
5. Agent verifies portal now shows Rabi 2026-27 - VERIFIED

**Check (safety rule):** Portal still shows Kharif 2026 until Approve is clicked.

---

## TC4 - Approved but NOT Paid

**App number:** KRB-2026-00748

**Steps:**
1. Manual Entry - TC4: Approved
2. Dashboard shows: **Approved** status (green) + **Payment NOT yet credited** (amber warning)
3. Conversation bar: type "has my money come"
4. Agent reply: "Approved does not mean paid. Money has NOT been credited yet."

**Check (correctness rule):** The agent NEVER says "paid" until portal payment_status changes to "credited".

To demonstrate TC4 after credit: open the simulate/credit endpoint then re-check - agent now says money is credited.

---

## UNCERTAIN State (F3)

**App number:** KRB-2026-00850

**Steps:**
1. Manual Entry - enter KRB-2026-00850
2. Dashboard shows: UNCERTAIN banner (purple)
3. Agent chat: "what is my status"
4. Agent says it cannot confirm - payment_status is missing on portal

---

## Judge Console

Open: http://localhost:8000/console.html

- Click "Run all 4 tests" to run TC1-TC4 automatically
- View evidence log, agent conversation (message bus), checks vs portal
- Use portal controls: simulate down, drop_writes, etc.

---

## Safety Rules Demonstrated

| Rule | Where shown |
|------|-------------|
| Approved != Paid | TC4 amber banner + agent reply |
| No change without approval | TC2/TC3 approval panel + Reject stays unchanged |
| Exact document names | TC2 shows "Land Record (Khatauni)" verbatim from portal |
| UNCERTAIN when data missing | KRB-2026-00850 purple banner |
| Independent verification | TC2/TC3: VERIFIED shown only after portal re-read confirms |
| Portal down != not found | F2: separate error messages |
| No OTP bypass | auth.html shows demo OTP in yellow box; farmer must type it |
