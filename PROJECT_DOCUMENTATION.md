# Kisan Insurance — Crop Claim Tracker
## Complete Project Documentation

> **All data is synthetic. No real farmer, Aadhaar, PAN, or bank information is used.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Multi-Agent Pipeline](#4-multi-agent-pipeline)
5. [Agent Descriptions](#5-agent-descriptions)
6. [Business Rules](#6-business-rules)
7. [Frontend Pages and Features](#7-frontend-pages-and-features)
8. [API Endpoints](#8-api-endpoints)
9. [Mock Portal](#9-mock-portal)
10. [NLU Intent Classification](#10-nlu-intent-classification)
11. [Voice System](#11-voice-system)
12. [Document Quality Checks](#12-document-quality-checks)
13. [Database Schema](#13-database-schema)
14. [Official Test Cases TC1-TC4](#14-official-test-cases-tc1-tc4)
15. [Safety Rules](#15-safety-rules)
16. [File Structure](#16-file-structure)
17. [Setup and Run](#17-setup-and-run)

---

## 1. Project Overview

**Kisan Insurance Crop Claim Tracker** is an AI-powered crop insurance claim assistant built for Indian farmers. It lets farmers check their insurance claim status, find out which documents are missing, fix errors in their record (wrong season), and upload required documents — all by **speaking in Hindi or English**.

### Problem Being Solved

Indian farmers struggle to:
- Track the status of their crop insurance claims
- Understand why payment is delayed after approval
- Know which exact documents the portal wants
- Navigate complex government portals without literacy

### Solution

A conversational agent that:
- **Listens** to the farmer's voice (Web Speech API, hi-IN / en-IN)
- **Understands** the intent using a trained NLU model (scikit-learn TF-IDF + LogReg)
- **Reads** the insurance portal to get real data
- **Applies business rules** (approved != paid, UNCERTAIN if data missing)
- **Proposes changes** (season correction, document upload) and **asks for approval before acting**
- **Verifies** every action by re-reading the portal independently
- **Speaks the result** in the farmer's language

---

## 2. Technology Stack

### Backend
| Component | Technology | Version |
|---|---|---|
| Web framework | FastAPI | 0.115.6 |
| ASGI server | Uvicorn | 0.32.1 |
| HTTP client (agent to portal) | httpx | 0.28.1 |
| NLU model (intent classification) | scikit-learn (TF-IDF + LogReg) | 1.5.2 |
| Model serialization | joblib | 1.4.2 |
| Document quality checks | OpenCV (headless) | 4.10.0.84 |
| Image processing | NumPy | 2.4.6 |
| File upload | python-multipart | 0.0.20 |
| Database | SQLite (stdlib, in-memory) | — |
| Language | Python | 3.11 |

### Frontend
| Component | Technology |
|---|---|
| UI | Pure HTML5 / CSS3 / Vanilla JS |
| Fonts | Google Fonts — Poppins |
| Icons | Font Awesome 6.4.0 |
| Voice input | Web Speech API — SpeechRecognition |
| Voice output | Web Speech API — SpeechSynthesis |
| Languages | English (en-IN), Hindi (hi-IN) |
| State | localStorage |

---

