# ScholarPanel AI — Multi-Agent Grant and Scholarship Application Evaluator

An institutional-grade, localhost-ready **Grant and Scholarship Application Evaluator** multi-agent system powered by **Azure AI Foundry** (`azure-ai-projects`, `azure-identity`), **FastAPI** (Python backend), and **Next.js** (App Router, TypeScript, Tailwind CSS frontend).

The system automates scholarship evaluation against an official, line-numbered scoring rubric using a **Conditional + Fan-Out / Fan-In** multi-agent workflow:
- **Stage 1 (Intake):** `IntakeAgent` normalizes unstructured application text into a strict Pydantic model (`StructuredApplication`).
- **Stage 2 (Gatekeeper):** `EligibilityAgent` audits the 5 hard Section 1 eligibility rules via RAG. If any hard rule fails (e.g. GPA < 3.00), the workflow **short-circuits and rejects outright**, citing the exact failed rubric rule ID and line.
- **Stage 3 (Fan-Out Parallel Scoring):** If eligible, the workflow fans out concurrently to two specialist agents:
  - `MeritAgent`: Scores GPA rigor (0–40 pts), research/leadership impact (0–35 pts), and personal statement clarity (0–25 pts) (Weight: 55%).
  - `NeedAgent`: Scores household income/dependents ratio (0–60 pts) and special hardship/tuition gap (0–40 pts) (Weight: 45%).
- **Stage 4 (Fan-In Aggregation & Decision):** `PanelManager` aggregates parallel scores, deterministically computes the weighted total score `(Merit * 0.55) + (Need * 0.45)`, applies decision thresholds (`AWARD >= 78.0`, `WAITLIST 60.0–77.9`, `REJECT < 60.0`), and produces an auditable decision scorecard with exact cited rubric lines.

---

## 1. Clean & Streamlined Backend Dependencies

The backend is built strictly using the minimal requested libraries:
- `azure-ai-projects` (Azure AI Foundry SDK)
- `azure-identity` (DefaultAzureCredential authentication)
- `python-dotenv` (Environment variable loading)
- `fastapi` & `uvicorn` (Asynchronous REST & SSE streaming server)
- `pydantic` (Validated schemas & typed contracts)

No unnecessary packages or heavy vector database daemons required.

---

## 2. Directory Structure

```text
ScholarPanel AI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, CORS, SSE streaming & REST endpoints
│   │   ├── config.py                # App settings for Azure AI Foundry
│   │   ├── schemas.py               # Pydantic schemas (Application, Citations, Decisions)
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   ├── rubric_store.py      # Line-indexed rubric chunker & similarity search
│   │   │   └── rubric_tools.py      # Framework tool function definitions for agents
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── foundry_client.py    # Azure AI Foundry client wrapper with local fallback
│   │   │   ├── intake_agent.py      # Stage 1: Intake Agent
│   │   │   ├── eligibility_agent.py # Stage 2: Gatekeeper Eligibility Agent
│   │   │   ├── merit_agent.py       # Stage 3: Merit Specialist Agent (55% wt)
│   │   │   ├── need_agent.py        # Stage 3: Financial Need Specialist Agent (45% wt)
│   │   │   └── panel_manager.py     # Stage 4: Panel Manager & Deterministic Aggregation
│   │   └── workflows/
│   │       ├── __init__.py
│   │       └── evaluation_workflow.py # Conditional + Fan-Out / Fan-In Orchestrator
│   ├── data/
│   │   ├── published_rubric.md      # Line-numbered official scholarship rubric [RUBRIC-L01] to [RUBRIC-L44]
│   │   └── sample_applications.json # 3 pre-built benchmark test cases
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             # Main Evaluator Dashboard
│   │   ├── components/
│   │   │   ├── ApplicationForm.tsx  # Preset loader, submission editor & Rubric Modal
│   │   │   ├── WorkflowVisualizer.tsx # Live graph showing Intake -> Gatekeeper -> Fan-Out -> Fan-In
│   │   │   └── DecisionScorecard.tsx  # Color-coded badge, breakdown table & audit download
│   │   └── lib/
│   │       └── api.ts               # Typed REST & SSE streaming client
│   ├── package.json
│   └── .env.local.example
└── README.md
```

---

## 3. Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:
```env
# Azure AI Foundry Configuration
FOUNDRY_PROJECT_ENDPOINT=https://your-resource.services.ai.azure.com/api/projects/your-project-id
FOUNDRY_MODEL_DEPLOYMENT=gpt-4o
```
*(If `FOUNDRY_PROJECT_ENDPOINT` is left blank, the system automatically runs in local deterministic simulation mode, enabling 100% offline localhost testing of the entire multi-agent pipeline immediately).*

### Frontend (`frontend/.env.local`)

Copy `frontend/.env.local.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 4. Localhost Quickstart

### Step 1: Start the Backend (FastAPI)

In your first terminal, activate the virtual environment and start the FastAPI server:

```powershell
# From project root
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`. You can test health at:
- `http://localhost:8000/api/health`
- `http://localhost:8000/docs` (Swagger UI)

### Step 2: Start the Frontend (Next.js)

In a second terminal, start the Next.js development server:

```powershell
# From project root
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. Pre-Built Benchmark Test Cases

The application includes 3 benchmark applicants ready to evaluate with one click:

1. **Aarav Sharma — High Merit & High Need [`AWARD`]**
   - **Profile:** Cumulative GPA 3.92, full-time student, citizen, household income $28,000 supporting 5 dependents, first-generation college student, published IEEE edge AI paper, $18,500 emergency tuition gap.
   - **Pipeline Execution:** Passes all 5 Gatekeeper rules. MeritAgent awards 94 pts (Band A GPA, Band A Research, Band A Vision). NeedAgent awards 92 pts (Band A Income/Dependents, Band A First-Gen/Gap).
   - **Result:** `AWARD` (Weighted Total: ~93.10 / 100 >= 78.0 under `[RUBRIC-L41]`).

2. **Priya Nair — Moderate Profile [`WAITLIST`]**
   - **Profile:** Cumulative GPA 3.48, full-time student, permanent resident, household income $62,000 with 2 dependents, active in biochemistry lab, healthcare diagnostics career statement, moderate unmet gap of $7,200.
   - **Pipeline Execution:** Passes all 5 Gatekeeper rules. MeritAgent awards ~73 pts (Band B GPA, Band B Lab, Band B Statement). NeedAgent awards ~59 pts (Band C Income, Band B Shortfall).
   - **Result:** `WAITLIST` (Weighted Total: ~66.70 / 100 within 60.0–77.9 under `[RUBRIC-L42]`).

3. **Rohan Verma — GPA Below 3.0 [`REJECT` at Gatekeeper]**
   - **Profile:** Cumulative GPA 2.78, full-time sophomore, citizen, household income $35,000 with 3 dependents. High financial need, but academic transcript indicates GPA 2.78 < 3.00.
   - **Pipeline Execution:** Fails Criterion 1.1 Academic Benchmark (`[RUBRIC-L04]`). The workflow **short-circuits immediately**, skipping Merit & Need scoring.
   - **Result:** `REJECT` (Immediate disqualification under `[RUBRIC-L04]`, `[RUBRIC-L09]`, and `[RUBRIC-L43]`).

---

## 6. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health status and Azure AI Foundry configuration state |
| `GET` | `/api/rubric` | Full line-indexed published rubric with line IDs (`[RUBRIC-Lxx]`) |
| `GET` | `/api/samples` | The 3 benchmark test applicants |
| `POST` | `/api/evaluate` | Synchronous evaluation returning full `EvaluationResponse` |
| `POST` | `/api/evaluate/stream` | Server-Sent Events (SSE) streaming real-time agent execution events |

---

## 7. Audit & Compliance Export

Every evaluation result includes an **Export JSON Audit Report** button that downloads a complete audit record with exact timestamps, per-agent latencies, gatekeeper findings, per-criterion weighted point allocations, verbatim quotes from the published rubric, and committee executive syntheses.
