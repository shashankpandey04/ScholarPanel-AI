# ScholarPanel AI: Agents and Project Guide

## Agent count

The project has **5 implemented evaluation agents** in `backend/app/agents/`:

1. `IntakeAgent`
2. `EligibilityAgent`
3. `MeritAgent`
4. `NeedAgent`
5. `PanelManager`

The workflow also emits `WorkflowCoordinator` and `FanOutCoordinator` labels in
streaming events. These are orchestration roles, not separate agent
implementations or scoring agents.

See [dfd.md](dfd.md) for the context diagram, Level 1 data flow, data stores,
trust boundaries, and source mapping.

## Agent inventory

### 1. IntakeAgent

- **Implementation:** `backend/app/agents/intake_agent.py`
- **Stage:** Intake (Stage 1)
- **Use:** Converts raw, unstructured application text and optional metadata into
  the validated `StructuredApplication` Pydantic model.
- **Output:** Applicant identity, GPA, enrollment and residency status, income,
  dependents, first-generation status, achievements, goals, and financial
  circumstances.
- **System prompt summary:** Acts as the official admissions intake specialist.
  It must extract and normalize the specified applicant fields, generate a
  missing applicant ID when necessary, and return only a JSON object matching
  the required schema. It does not make an eligibility or funding decision.

### 2. EligibilityAgent

- **Implementation:** `backend/app/agents/eligibility_agent.py`
- **Stage:** Gatekeeper eligibility (Stage 2)
- **Use:** Audits the five non-negotiable Section 1 rules before any scoring.
- **Rules checked:**
  - GPA of at least 3.00
  - Full-time enrollment
  - Eligible citizenship, residency, or documented visa status
  - Verified household income no higher than $85,000
  - No documented academic-integrity or disciplinary violations
- **Output:** Per-rule pass/fail checks, exact rubric citations, failed-rule
  details, and an overall eligibility result.
- **System prompt summary:** Acts as the scholarship board's gatekeeper
  auditor. It must use rubric search to verify the official rules, cite the
  exact rubric line and text for every check, and immediately mark the
  application ineligible if any hard rule fails.

### 3. MeritAgent

- **Implementation:** `backend/app/agents/merit_agent.py`
- **Stage:** Parallel specialist scoring (Stage 3)
- **Use:** Evaluates academic and achievement merit for a maximum of 100 raw
  points, contributing **55%** of the final score.
- **Criteria:**
  - GPA and academic rigor: 0-40
  - Research, projects, and leadership impact: 0-35
  - Personal statement clarity and goals: 0-25
- **Output:** An integer score and rubric citation for each criterion, a
  0-100 merit subtotal, and a summary.
- **System prompt summary:** Acts as the academic and achievement evaluator.
  It must retrieve the rubric bands, assign an integer score inside the
  appropriate band, cite every score with a `RubricCitation`, and calculate the
  merit subtotal.

### 4. NeedAgent

- **Implementation:** `backend/app/agents/need_agent.py`
- **Stage:** Parallel specialist scoring (Stage 3)
- **Use:** Evaluates financial need for a maximum of 100 raw points,
  contributing **45%** of the final score.
- **Criteria:**
  - Verified household income and dependents ratio: 0-60
  - Special circumstances, first-generation status, and unmet tuition gap:
    0-40
- **Output:** An integer score and rubric citation for each criterion, a
  0-100 need subtotal, and a summary.
- **System prompt summary:** Acts as the socioeconomic and financial-need
  evaluator. It must retrieve the official scoring bands, assign precise
  in-band integer scores, cite every score, and calculate the need subtotal.

### 5. PanelManager

- **Implementation:** `backend/app/agents/panel_manager.py`
- **Stage:** Panel synthesis and decision (Stage 4)
- **Use:** Combines specialist results, applies fixed weights and thresholds,
  and produces the auditable final decision.
- **Calculation:**
  `Weighted Total = (Merit Subtotal * 0.55) + (Need Subtotal * 0.45)`
- **Decision thresholds:**
  - `AWARD`: weighted total >= 78.0
  - `WAITLIST`: weighted total from 60.0 through 77.9
  - `REJECT`: weighted total < 60.0, or any eligibility failure
- **Output:** Final decision, weighted total, executive synthesis, cited rubric
  lines, and criterion-level weighted breakdown.
- **System prompt summary:** Acts as the committee chairperson. It must
  aggregate the fan-in results deterministically, enforce the published
  formula and thresholds, and write a transparent executive rationale with
  exact rubric citations. The current implementation performs this calculation
  deterministically in Python.

## Workflow

The workflow is implemented by
`backend/app/workflows/evaluation_workflow.py`:

```text
Raw application
      |
      v
IntakeAgent
      |
      v
EligibilityAgent
      |
      +-- failed rule --> PanelManager --> REJECT
      |
      +-- passed -------> MeritAgent  --+
                         NeedAgent   --+--> PanelManager --> AWARD/WAITLIST/REJECT
```

For eligible applications, `MeritAgent` and `NeedAgent` run concurrently with
`asyncio.gather`. For an ineligible application, the workflow short-circuits:
both specialist agents are skipped and the `PanelManager` records an immediate
rejection.

The same workflow is available in:

- Synchronous form through `POST /api/evaluate`
- Streaming SSE form through `POST /api/evaluate/stream`

## What the project is about

ScholarPanel AI is a localhost-ready, multi-agent grant and scholarship
application evaluator. It helps a scholarship committee process unstructured
applicant submissions against a published, line-numbered rubric and return a
consistent, explainable, auditable decision.

The project is designed around:

- **Structured intake:** raw applicant text becomes a typed Pydantic model.
- **Hard eligibility gating:** disqualified applications do not receive
  downstream merit or need scores.
- **Parallel specialist review:** merit and financial need are evaluated
  independently.
- **Deterministic committee decisions:** fixed weights and thresholds prevent
  arbitrary aggregation.
- **Rubric-grounded auditability:** scores and decisions cite exact
  `[RUBRIC-Lxx]` lines and include justifications.
- **Live visibility:** the frontend can display agent progress through SSE
  events and show the final scorecard.

## Repository structure

### Backend

- `backend/app/main.py`: FastAPI application, CORS, REST endpoints, and SSE.
- `backend/app/config.py`: environment-backed application configuration.
- `backend/app/schemas.py`: typed Pydantic contracts for applications, scores,
  decisions, traces, and stream events.
- `backend/app/workflows/evaluation_workflow.py`: conditional and parallel
  workflow orchestration.
- `backend/app/agents/`: the five agents and model-client helpers.
- `backend/app/rag/rubric_store.py`: line-indexed rubric storage and search.
- `backend/app/rag/rubric_tools.py`: rubric tool definitions used by agents.
- `backend/data/published_rubric.md`: official 44-line scoring rubric.
- `backend/data/sample_applications.json`: benchmark applicant submissions.

### Frontend

- `frontend/src/app/page.tsx`: main evaluator dashboard.
- `frontend/src/app/evaluate/page.tsx`: evaluation view.
- `frontend/src/components/ApplicationForm.tsx`: application entry and sample
  loading.
- `frontend/src/components/WorkflowVisualizer.tsx`: live workflow progress.
- `frontend/src/components/DecisionScorecard.tsx`: decision, score breakdown,
  citations, and audit display.
- `frontend/src/lib/api.ts`: typed backend REST and SSE client.

## Runtime and model behavior

Each agent first attempts cloud model execution through
`backend/app/agents/openai_responses_client.py`, using the configured OpenAI
Responses-compatible endpoint and deployment. If the endpoint is unavailable,
the response cannot be parsed, or no usable API key is configured, the
implemented agents fall back to deterministic local logic where available.

`backend/app/agents/foundry_client.py` contains an Azure AI Foundry
`AIProjectClient`/`DefaultAzureCredential` integration wrapper for Foundry-based
completion. The active agent modules currently call the OpenAI Responses client
directly.

## Main API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Reports service and rubric readiness |
| `GET` | `/api/rubric` | Returns the indexed published rubric |
| `GET` | `/api/samples` | Returns benchmark applications |
| `POST` | `/api/evaluate` | Runs a complete synchronous evaluation |
| `POST` | `/api/evaluate/stream` | Streams workflow events over SSE |

## Local development

### Backend

From the repository root in PowerShell:

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

The backend is available at `http://localhost:8000`. Swagger UI is available
at `http://localhost:8000/docs`.

### Frontend

In a second terminal:

```powershell
cd frontend
npm run dev
```

The frontend is available at `http://localhost:3000`.

## Configuration

Backend environment variables are read from `backend/.env`:

- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `MODEL_DEPLOYMENT`
- Optional Azure Foundry settings such as `FOUNDRY_PROJECT_ENDPOINT`

The frontend uses `NEXT_PUBLIC_API_URL`, normally set to
`http://localhost:8000`.

When a valid API key is not configured, the backend health endpoint reports
**Local Deterministic Rubric Simulation Mode**, allowing the complete pipeline
to run locally without a model service.

## Benchmark outcomes

The included sample applications exercise the principal workflow branches:

- A strong merit and high-need applicant reaches `AWARD`.
- A moderate applicant reaches `WAITLIST`.
- An applicant below the 3.00 GPA gate is immediately `REJECT`ed and never
  reaches MeritAgent or NeedAgent.

