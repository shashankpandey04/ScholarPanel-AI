from typing import Literal
from app.schemas import (
    StructuredApplication, 
    EligibilityResult, 
    MeritResult, 
    NeedResult, 
    FinalDecision, 
    CriterionBreakdownItem
)
from app.rag.rubric_tools import get_rubric_line

PANEL_SYSTEM_PROMPT = """You are the Panel Manager and Committee Chairperson for the Global Excellence and Opportunity Scholarship.
Your duty is to aggregate the fanned-in scoring evaluations from the Merit and Need agents, enforce deterministic mathematical weights, and apply published committee decision thresholds:
- Weighted Total Formula: (Merit Subtotal * 0.55) + (Need Subtotal * 0.45) [RUBRIC-L40]
- AWARD Threshold: Weighted Total >= 78.0 [RUBRIC-L41]
- WAITLIST Threshold: 60.0 <= Weighted Total <= 77.9 [RUBRIC-L42]
- REJECT Threshold: Weighted Total < 60.0 OR any Section 1 Hard Eligibility failure [RUBRIC-L43]

You must draft an auditable, transparent executive synthesis citing exact rubric lines and providing a clear defensible rationale.
"""

def compute_panel_decision(
    app: StructuredApplication,
    eligibility: EligibilityResult,
    merit: MeritResult | None,
    need: NeedResult | None
) -> tuple[FinalDecision, list[CriterionBreakdownItem]]:
    """Deterministically aggregates scores, applies official thresholds, and produces breakdown items."""
    cited_lines: list[str] = []

    # If rejected at Gatekeeper Eligibility
    if not eligibility.is_eligible:
        failed_id = eligibility.failed_rule.line_id if eligibility.failed_rule else "RUBRIC-L09"
        cited_lines.extend(["RUBRIC-L03", failed_id, "RUBRIC-L09", "RUBRIC-L43"])
        
        synthesis = (
            f"The Scholarship Committee has rendered a terminal REJECT decision at the Gatekeeper stage. "
            f"The application failed mandatory Hard Eligibility criterion {failed_id} "
            f"('{eligibility.failed_rule.quote if eligibility.failed_rule else 'Eligibility criteria not met'}'). "
            f"In accordance with [RUBRIC-L09] and [RUBRIC-L43], applications with any Section 1 deficiency "
            f"are short-circuited and barred from merit or financial need funding allocation."
        )

        decision = FinalDecision(
            decision="REJECT",
            weighted_total=0.0,
            merit_subtotal=0,
            need_subtotal=0,
            merit_weight=0.55,
            need_weight=0.45,
            executive_synthesis=synthesis,
            cited_rubric_lines=cited_lines
        )
        return decision, []

    # Compute deterministic weighted total
    m_sub = merit.merit_subtotal if merit else 0
    n_sub = need.need_subtotal if need else 0

    weighted_total = round((m_sub * 0.55) + (n_sub * 0.45), 2)

    # Determine decision status
    if weighted_total >= 78.0:
        decision_str: Literal["AWARD", "WAITLIST", "REJECT"] = "AWARD"
        thresh_line = "RUBRIC-L41"
        outcome_detail = f"Weighted total score of {weighted_total:.2f} surpasses the rigorous honors threshold of 78.00."
    elif weighted_total >= 60.0:
        decision_str = "WAITLIST"
        thresh_line = "RUBRIC-L42"
        outcome_detail = f"Weighted total score of {weighted_total:.2f} qualifies for the competitive secondary waitlist (60.00 to 77.90)."
    else:
        decision_str = "REJECT"
        thresh_line = "RUBRIC-L43"
        outcome_detail = f"Weighted total score of {weighted_total:.2f} falls below the minimum competitive threshold of 60.00."

    # Collect cited lines
    cited_lines.extend([
        "RUBRIC-L04", "RUBRIC-L05", "RUBRIC-L06", "RUBRIC-L07", "RUBRIC-L08",
        merit.gpa_rigor.citation.line_id if merit else "RUBRIC-L11",
        merit.research_leadership.citation.line_id if merit else "RUBRIC-L16",
        merit.personal_statement.citation.line_id if merit else "RUBRIC-L21",
        "RUBRIC-L26",
        need.income_dependents.citation.line_id if need else "RUBRIC-L28",
        need.special_circumstances_gap.citation.line_id if need else "RUBRIC-L33",
        "RUBRIC-L38",
        "RUBRIC-L40",
        thresh_line,
        "RUBRIC-L44"
    ])

    synthesis = (
        f"The Scholarship Committee has completed formal multi-agent review for {app.full_name} ({app.applicant_id}). "
        f"Applicant successfully cleared all Section 1 gatekeeper checks. "
        f"In concurrent specialist evaluation, the candidate achieved a Merit Subtotal of {m_sub}/100 pts (55% weight, contributing {(m_sub * 0.55):.2f} pts) "
        f"and a Financial Need Subtotal of {n_sub}/100 pts (45% weight, contributing {(n_sub * 0.45):.2f} pts). "
        f"Under official formula [RUBRIC-L40], the aggregate Weighted Total is {weighted_total:.2f}/100 pts. "
        f"{outcome_detail} Final Committee Determination: {decision_str} under [{thresh_line}]."
    )

    decision = FinalDecision(
        decision=decision_str,
        weighted_total=weighted_total,
        merit_subtotal=m_sub,
        need_subtotal=n_sub,
        merit_weight=0.55,
        need_weight=0.45,
        executive_synthesis=synthesis,
        cited_rubric_lines=list(dict.fromkeys(cited_lines))
    )

    # Build detailed per-criterion breakdown
    breakdown: list[CriterionBreakdownItem] = []

    if merit:
        # Criterion 2.1: GPA (max 40 pts, relative weight 40 * 0.55 = 22.0%)
        breakdown.append(CriterionBreakdownItem(
            section="Academic Merit (55%)",
            criterion_name=merit.gpa_rigor.name,
            max_score=40,
            raw_score=merit.gpa_rigor.raw_score,
            weight_percentage=22.0,
            weighted_points=round(merit.gpa_rigor.raw_score * 0.55, 2),
            citation_line_id=merit.gpa_rigor.citation.line_id,
            verbatim_quote=merit.gpa_rigor.citation.quote,
            justification=merit.gpa_rigor.citation.justification
        ))

        # Criterion 2.2: Research & Leadership (max 35 pts, relative weight 35 * 0.55 = 19.25%)
        breakdown.append(CriterionBreakdownItem(
            section="Academic Merit (55%)",
            criterion_name=merit.research_leadership.name,
            max_score=35,
            raw_score=merit.research_leadership.raw_score,
            weight_percentage=19.25,
            weighted_points=round(merit.research_leadership.raw_score * 0.55, 2),
            citation_line_id=merit.research_leadership.citation.line_id,
            verbatim_quote=merit.research_leadership.citation.quote,
            justification=merit.research_leadership.citation.justification
        ))

        # Criterion 2.3: Statement (max 25 pts, relative weight 25 * 0.55 = 13.75%)
        breakdown.append(CriterionBreakdownItem(
            section="Academic Merit (55%)",
            criterion_name=merit.personal_statement.name,
            max_score=25,
            raw_score=merit.personal_statement.raw_score,
            weight_percentage=13.75,
            weighted_points=round(merit.personal_statement.raw_score * 0.55, 2),
            citation_line_id=merit.personal_statement.citation.line_id,
            verbatim_quote=merit.personal_statement.citation.quote,
            justification=merit.personal_statement.citation.justification
        ))

    if need:
        # Criterion 3.1: Income & Dependents (max 60 pts, relative weight 60 * 0.45 = 27.0%)
        breakdown.append(CriterionBreakdownItem(
            section="Financial Need (45%)",
            criterion_name=need.income_dependents.name,
            max_score=60,
            raw_score=need.income_dependents.raw_score,
            weight_percentage=27.0,
            weighted_points=round(need.income_dependents.raw_score * 0.45, 2),
            citation_line_id=need.income_dependents.citation.line_id,
            verbatim_quote=need.income_dependents.citation.quote,
            justification=need.income_dependents.citation.justification
        ))

        # Criterion 3.2: Special Hardship Gap (max 40 pts, relative weight 40 * 0.45 = 18.0%)
        breakdown.append(CriterionBreakdownItem(
            section="Financial Need (45%)",
            criterion_name=need.special_circumstances_gap.name,
            max_score=40,
            raw_score=need.special_circumstances_gap.raw_score,
            weight_percentage=18.0,
            weighted_points=round(need.special_circumstances_gap.raw_score * 0.45, 2),
            citation_line_id=need.special_circumstances_gap.citation.line_id,
            verbatim_quote=need.special_circumstances_gap.citation.quote,
            justification=need.special_circumstances_gap.citation.justification
        ))

    return decision, breakdown
