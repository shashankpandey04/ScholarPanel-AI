import time
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Any

from app.schemas import (
    StructuredApplication,
    EligibilityResult,
    MeritResult,
    NeedResult,
    FinalDecision,
    CriterionBreakdownItem,
    AgentTraceItem,
    EvaluationResponse,
    StreamEvent
)
from app.agents.intake_agent import run_intake_agent
from app.agents.eligibility_agent import run_eligibility_agent
from app.agents.merit_agent import run_merit_agent
from app.agents.need_agent import run_need_agent
from app.agents.panel_manager import compute_panel_decision

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class EvaluationWorkflowRunner:
    """Executes the Conditional + Fan-Out / Fan-In multi-agent scholarship evaluation workflow."""

    async def execute(
        self,
        raw_submission_text: str,
        metadata: dict[str, Any] | None = None
    ) -> EvaluationResponse:
        """Runs complete multi-agent workflow and returns full EvaluationResponse."""
        start_time = time.perf_counter()
        traces: list[AgentTraceItem] = []

        # Stage 1: Intake
        t0 = time.perf_counter()
        app = await run_intake_agent(raw_submission_text, metadata)
        d0 = (time.perf_counter() - t0) * 1000
        traces.append(AgentTraceItem(
            stage="Intake",
            agent_name="IntakeAgent",
            status="COMPLETED",
            duration_ms=d0,
            timestamp=_now_iso(),
            detail=f"Parsed applicant profile for {app.full_name} ({app.applicant_id}), GPA {app.gpa:.2f}, Income ${app.annual_income:,.0f}."
        ))

        # Stage 2: Gatekeeper Eligibility
        t1 = time.perf_counter()
        eligibility = await run_eligibility_agent(app)
        d1 = (time.perf_counter() - t1) * 1000

        if not eligibility.is_eligible:
            # Short-circuit branch
            failed_info = eligibility.failed_rule.line_id if eligibility.failed_rule else "Rule failed"
            traces.append(AgentTraceItem(
                stage="Eligibility",
                agent_name="EligibilityAgent",
                status="SHORT_CIRCUITED",
                duration_ms=d1,
                timestamp=_now_iso(),
                detail=f"Failed Section 1 gatekeeper rule [{failed_info}]. Short-circuiting workflow."
            ))
            traces.append(AgentTraceItem(
                stage="Merit",
                agent_name="MeritAgent",
                status="SKIPPED",
                duration_ms=0,
                timestamp=_now_iso(),
                detail="Skipped due to Gatekeeper disqualification."
            ))
            traces.append(AgentTraceItem(
                stage="Need",
                agent_name="NeedAgent",
                status="SKIPPED",
                duration_ms=0,
                timestamp=_now_iso(),
                detail="Skipped due to Gatekeeper disqualification."
            ))

            t_panel = time.perf_counter()
            decision, breakdown = compute_panel_decision(app, eligibility, None, None)
            d_panel = (time.perf_counter() - t_panel) * 1000
            traces.append(AgentTraceItem(
                stage="Panel",
                agent_name="PanelManager",
                status="COMPLETED",
                duration_ms=d_panel,
                timestamp=_now_iso(),
                detail=f"Terminal decision REJECT issued under [{decision.cited_rubric_lines[1]}]."
            ))

            total_duration = (time.perf_counter() - start_time) * 1000
            return EvaluationResponse(
                applicant=app,
                eligibility=eligibility,
                merit=None,
                need=None,
                decision=decision,
                breakdown=breakdown,
                traces=traces,
                total_duration_ms=total_duration
            )

        # Gatekeeper passed
        traces.append(AgentTraceItem(
            stage="Eligibility",
            agent_name="EligibilityAgent",
            status="COMPLETED",
            duration_ms=d1,
            timestamp=_now_iso(),
            detail="Cleared all Section 1 hard criteria. Fan-Out triggered."
        ))

        # Stage 3: Fan-Out Parallel Scoring (Merit + Need concurrently)
        t_fanout = time.perf_counter()
        merit_task = run_merit_agent(app)
        need_task = run_need_agent(app)
        merit_result, need_result = await asyncio.gather(merit_task, need_task)
        d_fanout = (time.perf_counter() - t_fanout) * 1000

        traces.append(AgentTraceItem(
            stage="Merit",
            agent_name="MeritAgent",
            status="COMPLETED",
            duration_ms=d_fanout,
            timestamp=_now_iso(),
            detail=f"Scored Merit Subtotal: {merit_result.merit_subtotal}/100 (55% wt)."
        ))
        traces.append(AgentTraceItem(
            stage="Need",
            agent_name="NeedAgent",
            status="COMPLETED",
            duration_ms=d_fanout,
            timestamp=_now_iso(),
            detail=f"Scored Need Subtotal: {need_result.need_subtotal}/100 (45% wt)."
        ))

        # Stage 4: Fan-In Aggregation & Decision
        t_panel = time.perf_counter()
        decision, breakdown = compute_panel_decision(app, eligibility, merit_result, need_result)
        d_panel = (time.perf_counter() - t_panel) * 1000
        traces.append(AgentTraceItem(
            stage="Panel",
            agent_name="PanelManager",
            status="COMPLETED",
            duration_ms=d_panel,
            timestamp=_now_iso(),
            detail=f"Deterministic weighted total: {decision.weighted_total:.2f}. Final Decision: {decision.decision}."
        ))

        total_duration = (time.perf_counter() - start_time) * 1000
        return EvaluationResponse(
            applicant=app,
            eligibility=eligibility,
            merit=merit_result,
            need=need_result,
            decision=decision,
            breakdown=breakdown,
            traces=traces,
            total_duration_ms=total_duration
        )

    async def stream(
        self,
        raw_submission_text: str,
        metadata: dict[str, Any] | None = None
    ) -> AsyncGenerator[StreamEvent, None]:
        """Streams real-time workflow events via SSE as each executor finishes."""
        start_time = time.perf_counter()
        traces: list[AgentTraceItem] = []

        # Workflow Started
        yield StreamEvent(
            event_type="WorkflowStartedEvent",
            stage="Init",
            agent="WorkflowCoordinator",
            status="RUNNING",
            message="Scholarship Evaluation Pipeline initiated.",
            payload={"timestamp": _now_iso()},
            timestamp=_now_iso()
        )

        # Stage 1: Intake
        yield StreamEvent(
            event_type="ExecutorInvokeEvent",
            stage="Intake",
            agent="IntakeAgent",
            status="RUNNING",
            message="IntakeAgent parsing raw application text into validated Pydantic schema...",
            timestamp=_now_iso()
        )
        t0 = time.perf_counter()
        app = await run_intake_agent(raw_submission_text, metadata)
        d0 = (time.perf_counter() - t0) * 1000
        yield StreamEvent(
            event_type="ExecutorCompleteEvent",
            stage="Intake",
            agent="IntakeAgent",
            status="COMPLETED",
            message=f"Normalized dossier for {app.full_name} ({app.applicant_id}).",
            payload={"applicant": app.model_dump(), "duration_ms": d0},
            timestamp=_now_iso()
        )

        # Stage 2: Gatekeeper Eligibility
        yield StreamEvent(
            event_type="ExecutorInvokeEvent",
            stage="Eligibility",
            agent="EligibilityAgent",
            status="RUNNING",
            message="EligibilityAgent auditing Section 1 Hard Rules via rubric RAG...",
            timestamp=_now_iso()
        )
        t1 = time.perf_counter()
        eligibility = await run_eligibility_agent(app)
        d1 = (time.perf_counter() - t1) * 1000

        if not eligibility.is_eligible:
            # Gatekeeper failed -> Short-circuit
            failed_id = eligibility.failed_rule.line_id if eligibility.failed_rule else "RUBRIC-L09"
            yield StreamEvent(
                event_type="ExecutorCompleteEvent",
                stage="Eligibility",
                agent="EligibilityAgent",
                status="SHORT_CIRCUITED",
                message=f"Gatekeeper failed on rule [{failed_id}]. Short-circuiting workflow to REJECT.",
                payload={"is_eligible": False, "failed_rule": eligibility.failed_rule.model_dump() if eligibility.failed_rule else None, "duration_ms": d1},
                timestamp=_now_iso()
            )

            decision, breakdown = compute_panel_decision(app, eligibility, None, None)
            total_duration = (time.perf_counter() - start_time) * 1000
            final_resp = EvaluationResponse(
                applicant=app,
                eligibility=eligibility,
                merit=None,
                need=None,
                decision=decision,
                breakdown=breakdown,
                traces=[
                    AgentTraceItem(stage="Intake", agent_name="IntakeAgent", status="COMPLETED", duration_ms=d0, timestamp=_now_iso(), detail=f"Normalized {app.full_name}"),
                    AgentTraceItem(stage="Eligibility", agent_name="EligibilityAgent", status="SHORT_CIRCUITED", duration_ms=d1, timestamp=_now_iso(), detail=f"Disqualified at [{failed_id}]"),
                    AgentTraceItem(stage="Panel", agent_name="PanelManager", status="COMPLETED", duration_ms=10.0, timestamp=_now_iso(), detail="Immediate rejection recorded.")
                ],
                total_duration_ms=total_duration
            )

            yield StreamEvent(
                event_type="WorkflowOutputEvent",
                stage="Panel",
                agent="PanelManager",
                status="COMPLETED",
                message="Workflow terminated with decision: REJECT.",
                payload={"evaluation": final_resp.model_dump()},
                timestamp=_now_iso()
            )
            return

        # Eligibility Passed
        yield StreamEvent(
            event_type="ExecutorCompleteEvent",
            stage="Eligibility",
            agent="EligibilityAgent",
            status="COMPLETED",
            message="All Section 1 Hard Rules verified. Fan-Out triggered.",
            payload={"is_eligible": True, "duration_ms": d1},
            timestamp=_now_iso()
        )

        # Stage 3: Fan-Out Parallel Scoring
        yield StreamEvent(
            event_type="ExecutorInvokeEvent",
            stage="FanOut",
            agent="FanOutCoordinator",
            status="RUNNING",
            message="Fanning out concurrently to MeritAgent (55%) and NeedAgent (45%)...",
            timestamp=_now_iso()
        )
        t_fanout = time.perf_counter()
        merit_task = run_merit_agent(app)
        need_task = run_need_agent(app)
        merit_result, need_result = await asyncio.gather(merit_task, need_task)
        d_fanout = (time.perf_counter() - t_fanout) * 1000

        yield StreamEvent(
            event_type="ExecutorCompleteEvent",
            stage="Merit",
            agent="MeritAgent",
            status="COMPLETED",
            message=f"MeritAgent scored {merit_result.merit_subtotal}/100 pts across GPA, Research & Vision.",
            payload={"merit_subtotal": merit_result.merit_subtotal, "duration_ms": d_fanout},
            timestamp=_now_iso()
        )
        yield StreamEvent(
            event_type="ExecutorCompleteEvent",
            stage="Need",
            agent="NeedAgent",
            status="COMPLETED",
            message=f"NeedAgent scored {need_result.need_subtotal}/100 pts across Income & Hardship Gap.",
            payload={"need_subtotal": need_result.need_subtotal, "duration_ms": d_fanout},
            timestamp=_now_iso()
        )

        # Stage 4: Fan-In Aggregation & Decision
        yield StreamEvent(
            event_type="ExecutorInvokeEvent",
            stage="Panel",
            agent="PanelManager",
            status="RUNNING",
            message="PanelManager aggregating weighted scores and evaluating committee thresholds...",
            timestamp=_now_iso()
        )
        t_panel = time.perf_counter()
        decision, breakdown = compute_panel_decision(app, eligibility, merit_result, need_result)
        d_panel = (time.perf_counter() - t_panel) * 1000

        total_duration = (time.perf_counter() - start_time) * 1000
        final_resp = EvaluationResponse(
            applicant=app,
            eligibility=eligibility,
            merit=merit_result,
            need=need_result,
            decision=decision,
            breakdown=breakdown,
            traces=[
                AgentTraceItem(stage="Intake", agent_name="IntakeAgent", status="COMPLETED", duration_ms=d0, timestamp=_now_iso(), detail=f"Parsed {app.full_name}"),
                AgentTraceItem(stage="Eligibility", agent_name="EligibilityAgent", status="COMPLETED", duration_ms=d1, timestamp=_now_iso(), detail="Cleared Section 1 gatekeeper checks"),
                AgentTraceItem(stage="Merit", agent_name="MeritAgent", status="COMPLETED", duration_ms=d_fanout, timestamp=_now_iso(), detail=f"Merit subtotal: {merit_result.merit_subtotal}/100"),
                AgentTraceItem(stage="Need", agent_name="NeedAgent", status="COMPLETED", duration_ms=d_fanout, timestamp=_now_iso(), detail=f"Need subtotal: {need_result.need_subtotal}/100"),
                AgentTraceItem(stage="Panel", agent_name="PanelManager", status="COMPLETED", duration_ms=d_panel, timestamp=_now_iso(), detail=f"Weighted Total: {decision.weighted_total:.2f}. Decision: {decision.decision}")
            ],
            total_duration_ms=total_duration
        )

        yield StreamEvent(
            event_type="WorkflowOutputEvent",
            stage="Panel",
            agent="PanelManager",
            status="COMPLETED",
            message=f"Evaluation complete. Decision: {decision.decision} with score {decision.weighted_total:.2f}.",
            payload={"evaluation": final_resp.model_dump()},
            timestamp=_now_iso()
        )

# Global runner instance
workflow_runner = EvaluationWorkflowRunner()
