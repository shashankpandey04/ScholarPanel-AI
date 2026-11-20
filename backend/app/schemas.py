from typing import Literal
from pydantic import BaseModel, Field

class RubricCitation(BaseModel):
    line_id: str = Field(..., description="Rubric Line ID, e.g., RUBRIC-L04")
    quote: str = Field(..., description="Verbatim text quote from the published rubric")
    justification: str = Field(..., description="Detailed explanation of how the applicant aligns with this rubric line")

class StructuredApplication(BaseModel):
    applicant_id: str = Field(..., description="Unique applicant identifier")
    full_name: str = Field(..., description="Applicant full legal name")
    gpa: float = Field(..., description="Cumulative GPA on 4.0 scale")
    enrollment_status: str = Field(..., description="Full-Time, Part-Time, or Non-Degree")
    residency_status: str = Field(..., description="Citizen, Permanent Resident, or Visa Holder")
    annual_income: float = Field(..., description="Annual verified household income in USD (or converted)")
    dependents: int = Field(..., description="Number of legal household dependents")
    first_gen: bool = Field(default=False, description="First-generation college student flag")
    achievements_summary: str = Field(..., description="Summary of research, leadership, and projects")
    statement_of_purpose: str = Field(..., description="Summary of statement clarity, motivations, and future goals")
    financial_circumstances: str = Field(..., description="Details of financial hardship, unmet tuition gap, or family adversity")

class RuleCheck(BaseModel):
    criterion_name: str = Field(..., description="Name of the eligibility rule")
    passed: bool = Field(..., description="True if condition met, False otherwise")
    rubric_line_id: str = Field(..., description="Exact line ID e.g., RUBRIC-L04")
    verbatim_rubric_text: str = Field(..., description="Exact text from published rubric")
    applicant_value: str = Field(..., description="The value extracted from applicant record")
    notes: str = Field(..., description="Verification rationale")

class EligibilityResult(BaseModel):
    is_eligible: bool = Field(..., description="Overall gatekeeper status: True to proceed to Merit & Need, False to short-circuit reject")
    checks: list[RuleCheck] = Field(default_factory=list, description="Detailed checks for each Section 1 rule")
    failed_rule: RubricCitation | None = Field(default=None, description="Failed rule citation if rejected")
    summary: str = Field(..., description="Gatekeeper evaluation summary")

class MeritCriterionScore(BaseModel):
    name: str = Field(..., description="Criterion name")
    max_points: int = Field(..., description="Max points possible")
    raw_score: int = Field(..., description="Awarded points")
    citation: RubricCitation = Field(..., description="Exact rubric line citation and justification")

class MeritResult(BaseModel):
    gpa_rigor: MeritCriterionScore = Field(..., description="Criterion 2.1 (0-40 pts)")
    research_leadership: MeritCriterionScore = Field(..., description="Criterion 2.2 (0-35 pts)")
    personal_statement: MeritCriterionScore = Field(..., description="Criterion 2.3 (0-25 pts)")
    merit_subtotal: int = Field(..., description="Merit subtotal sum (0-100 pts)")
    summary: str = Field(..., description="Agent synthesis of academic & extracurricular performance")

class NeedCriterionScore(BaseModel):
    name: str = Field(..., description="Criterion name")
    max_points: int = Field(..., description="Max points possible")
    raw_score: int = Field(..., description="Awarded points")
    citation: RubricCitation = Field(..., description="Exact rubric line citation and justification")

class NeedResult(BaseModel):
    income_dependents: NeedCriterionScore = Field(..., description="Criterion 3.1 (0-60 pts)")
    special_circumstances_gap: NeedCriterionScore = Field(..., description="Criterion 3.2 (0-40 pts)")
    need_subtotal: int = Field(..., description="Need subtotal sum (0-100 pts)")
    summary: str = Field(..., description="Agent synthesis of financial need and barriers")

class FinalDecision(BaseModel):
    decision: Literal["AWARD", "WAITLIST", "REJECT"] = Field(..., description="Final committee decision")
    weighted_total: float = Field(..., description="Deterministically calculated weighted total (0-100)")
    merit_subtotal: int = Field(default=0, description="Merit subtotal (0-100)")
    need_subtotal: int = Field(default=0, description="Need subtotal (0-100)")
    merit_weight: float = Field(default=0.55, description="Weight for merit (0.55)")
    need_weight: float = Field(default=0.45, description="Weight for need (0.45)")
    executive_synthesis: str = Field(..., description="Auditable executive synthesis citing official thresholds")
    cited_rubric_lines: list[str] = Field(default_factory=list, description="All rubric line IDs cited across the decision")

class CriterionBreakdownItem(BaseModel):
    section: str = Field(..., description="Merit or Financial Need")
    criterion_name: str = Field(..., description="Name of criterion")
    max_score: int = Field(..., description="Max possible raw points")
    raw_score: int = Field(..., description="Assigned raw points")
    weight_percentage: float = Field(..., description="Relative weight contribution e.g. 22.0%")
    weighted_points: float = Field(..., description="Points contributed to 100-pt weighted total")
    citation_line_id: str = Field(..., description="Rubric Line ID")
    verbatim_quote: str = Field(..., description="Verbatim text quote from rubric")
    justification: str = Field(..., description="Agent justification text")

class AgentTraceItem(BaseModel):
    stage: str = Field(..., description="Stage name e.g. Intake, Eligibility, Merit, Need, Panel")
    agent_name: str = Field(..., description="Agent identifier")
    status: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED", "SHORT_CIRCUITED"] = Field(..., description="Status")
    duration_ms: float = Field(default=0.0, description="Execution duration in milliseconds")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    detail: str = Field(..., description="Execution summary or output snippet")

class EvaluationRequest(BaseModel):
    applicant_id: str | None = Field(default=None)
    full_name: str | None = Field(default=None)
    raw_submission_text: str = Field(..., description="Raw unstructured text or JSON string of application")
    metadata: dict | None = Field(default=None, description="Optional pre-filled metadata")

class EvaluationResponse(BaseModel):
    applicant: StructuredApplication
    eligibility: EligibilityResult
    merit: MeritResult | None = None
    need: NeedResult | None = None
    decision: FinalDecision
    breakdown: list[CriterionBreakdownItem] = Field(default_factory=list)
    traces: list[AgentTraceItem] = Field(default_factory=list)
    total_duration_ms: float = Field(default=0.0)

class StreamEvent(BaseModel):
    event_type: str = Field(..., description="WorkflowStartedEvent, ExecutorInvokeEvent, ExecutorCompleteEvent, WorkflowOutputEvent")
    stage: str
    agent: str
    status: Literal["RUNNING", "COMPLETED", "FAILED", "SKIPPED", "SHORT_CIRCUITED"]
    message: str
    payload: dict | None = None
    timestamp: str
