import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import settings
from app.schemas import (
    EvaluationRequest,
    EvaluationResponse
)
from app.rag.rubric_store import rubric_store
from app.workflows.evaluation_workflow import workflow_runner

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent Grant & Scholarship Application Evaluator powered by Azure AI Foundry and Microsoft Agent Framework.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Verifies service readiness and environment settings."""
    has_foundry = bool(settings.FOUNDRY_PROJECT_ENDPOINT)
    lines_count = len(rubric_store.lines)

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "foundry_configured": has_foundry,
        "foundry_endpoint": settings.FOUNDRY_PROJECT_ENDPOINT or "Running in local simulation mode",
        "model_deployment": settings.FOUNDRY_MODEL_DEPLOYMENT,
        "rubric_lines_loaded": lines_count
    }

@app.get("/api/rubric")
async def get_published_rubric():
    """Returns all line-indexed rubric rules and the raw markdown."""
    try:
        raw_md = ""
        if Path(settings.RUBRIC_PATH).exists():
            with open(settings.RUBRIC_PATH, "r", encoding="utf-8") as f:
                raw_md = f.read()

        return {
            "total_lines": len(rubric_store.lines),
            "lines": rubric_store.get_all(),
            "raw_markdown": raw_md
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read rubric: {str(e)}")

@app.get("/api/samples")
async def get_sample_applicants():
    """Returns the benchmark sample applicant cases."""
    try:
        if Path(settings.SAMPLES_PATH).exists():
            with open(settings.SAMPLES_PATH, "r", encoding="utf-8") as f:
                samples = json.load(f)
            return samples
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read sample applications: {str(e)}")

@app.post("/api/evaluate", response_model=EvaluationResponse)
async def evaluate_application(request: EvaluationRequest):
    """Executes the full multi-agent evaluation workflow synchronously."""
    try:
        response = await workflow_runner.execute(
            raw_submission_text=request.raw_submission_text,
            metadata=request.metadata
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.post("/api/evaluate/stream")
async def evaluate_application_stream(request: EvaluationRequest):
    """Server-Sent Events (SSE) endpoint streaming real-time multi-agent execution events."""
    async def event_generator():
        try:
            async for event in workflow_runner.stream(
                raw_submission_text=request.raw_submission_text,
                metadata=request.metadata
            ):
                data = json.dumps(event.model_dump())
                yield f"data: {data}\n\n"
        except Exception as e:
            err_data = json.dumps({
                "event_type": "WorkflowErrorEvent",
                "stage": "Error",
                "agent": "System",
                "status": "FAILED",
                "message": f"Execution error: {str(e)}",
                "timestamp": ""
            })
            yield f"data: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
