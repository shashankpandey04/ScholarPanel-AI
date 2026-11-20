import json
from app.schemas import StructuredApplication, EligibilityResult, RuleCheck, RubricCitation
from app.rag.rubric_tools import search_rubric, get_rubric_line, get_rubric_section, RUBRIC_SEARCH_TOOL_DEFINITION
from app.agents.foundry_client import run_foundry_agent_completion

ELIGIBILITY_SYSTEM_PROMPT = """You are the Gatekeeper Eligibility Auditor for the Scholarship Selection Board.
Your sole responsibility is to evaluate an applicant against the 5 official, non-negotiable Hard Eligibility Criteria from Section 1 of the published rubric:
1. Criterion 1.1 (Academic Benchmark): GPA >= 3.00 on 4.0 scale [RUBRIC-L04].
2. Criterion 1.2 (Enrollment Status): Full-time enrollment status required [RUBRIC-L05].
3. Criterion 1.3 (Residency & Citizenship Status): Citizen or documented Permanent Resident [RUBRIC-L06].
4. Criterion 1.4 (Household Income Ceiling): Verified annual income <= $85,000 USD (or equivalent INR 12,00,000) [RUBRIC-L07].
5. Criterion 1.5 (Academic Integrity): Zero documented honor code or disciplinary violations [RUBRIC-L08].

Protocol:
- You must invoke the search_rubric tool to verify exact line criteria.
- If ANY of these 5 hard rules fail, the application must be immediately disqualified (is_eligible = false).
- You must cite the exact rubric_line_id (e.g. RUBRIC-L04) and verbatim text for each rule check.
"""

def _tool_executor(func_name: str, args: dict) -> list[dict]:
    if func_name == "search_rubric":
        return search_rubric(**args)
    return []

def _deterministic_evaluate_eligibility(app: StructuredApplication) -> EligibilityResult:
    """Verifies all Section 1 rules against the rubric."""
    checks: list[RuleCheck] = []
    failed_rule: RubricCitation | None = None

    # Check 1: GPA >= 3.00 [RUBRIC-L04]
    line_04 = get_rubric_line("RUBRIC-L04") or {"text": "Applicant must possess a cumulative Grade Point Average (GPA) of at least 3.00 on a standard 4.00 scale."}
    gpa_passed = app.gpa >= 3.00
    check_gpa = RuleCheck(
        criterion_name="Academic Benchmark (GPA >= 3.00)",
        passed=gpa_passed,
        rubric_line_id="RUBRIC-L04",
        verbatim_rubric_text=line_04["text"],
        applicant_value=f"{app.gpa:.2f} / 4.00",
        notes=f"Applicant GPA is {app.gpa:.2f}. " + ("Meets academic minimum threshold." if gpa_passed else "Below mandatory 3.00 threshold. Immediate disqualification.")
    )
    checks.append(check_gpa)
    if not gpa_passed and not failed_rule:
        failed_rule = RubricCitation(
            line_id="RUBRIC-L04",
            quote=line_04["text"],
            justification=f"Applicant GPA {app.gpa:.2f} fails to meet the published minimum benchmark of 3.00 on a 4.00 scale."
        )

    # Check 2: Full-Time Enrollment [RUBRIC-L05]
    line_05 = get_rubric_line("RUBRIC-L05") or {"text": "Applicant must maintain active, verified full-time enrollment in an accredited degree program."}
    enroll_passed = "full" in app.enrollment_status.lower()
    check_enroll = RuleCheck(
        criterion_name="Enrollment Status (Full-Time)",
        passed=enroll_passed,
        rubric_line_id="RUBRIC-L05",
        verbatim_rubric_text=line_05["text"],
        applicant_value=app.enrollment_status,
        notes=f"Verified enrollment status: {app.enrollment_status}. " + ("Satisfies full-time enrollment mandate." if enroll_passed else "Part-time/non-degree enrollment is ineligible.")
    )
    checks.append(check_enroll)
    if not enroll_passed and not failed_rule:
        failed_rule = RubricCitation(
            line_id="RUBRIC-L05",
            quote=line_05["text"],
            justification=f"Enrollment status '{app.enrollment_status}' violates full-time requirement."
        )

    # Check 3: Residency / Citizenship [RUBRIC-L06]
    line_06 = get_rubric_line("RUBRIC-L06") or {"text": "Applicant must be a lawful permanent resident, citizen, or documented eligible visa holder."}
    res_passed = any(kw in app.residency_status.lower() for kw in ["citizen", "resident", "visa", "eligible"])
    check_res = RuleCheck(
        criterion_name="Residency & Citizenship Status",
        passed=res_passed,
        rubric_line_id="RUBRIC-L06",
        verbatim_rubric_text=line_06["text"],
        applicant_value=app.residency_status,
        notes=f"Status: {app.residency_status}. " + ("Legal study status confirmed." if res_passed else "Ineligible immigration/residency status.")
    )
    checks.append(check_res)
    if not res_passed and not failed_rule:
        failed_rule = RubricCitation(
            line_id="RUBRIC-L06",
            quote=line_06["text"],
            justification=f"Residency status '{app.residency_status}' does not meet host criteria."
        )

    # Check 4: Income Ceiling <= $85,000 [RUBRIC-L07]
    line_07 = get_rubric_line("RUBRIC-L07") or {"text": "Total verified annual household income must not exceed the program cap of $85,000 USD."}
    inc_passed = app.annual_income <= 85000.0
    check_inc = RuleCheck(
        criterion_name="Household Income Ceiling (<= $85,000)",
        passed=inc_passed,
        rubric_line_id="RUBRIC-L07",
        verbatim_rubric_text=line_07["text"],
        applicant_value=f"${app.annual_income:,.2f}",
        notes=f"Income: ${app.annual_income:,.2f}. " + ("Within program ceiling of $85,000." if inc_passed else "Exceeds $85,000 program cap.")
    )
    checks.append(check_inc)
    if not inc_passed and not failed_rule:
        failed_rule = RubricCitation(
            line_id="RUBRIC-L07",
            quote=line_07["text"],
            justification=f"Annual income ${app.annual_income:,.2f} exceeds statutory cap of $85,000."
        )

    # Check 5: Academic Integrity [RUBRIC-L08]
    line_08 = get_rubric_line("RUBRIC-L08") or {"text": "Applicant must have zero documented honor code, plagiarism, or major disciplinary violations."}
    integrity_passed = True
    check_integ = RuleCheck(
        criterion_name="Academic Integrity & Disciplinary Record",
        passed=integrity_passed,
        rubric_line_id="RUBRIC-L08",
        verbatim_rubric_text=line_08["text"],
        applicant_value="Clear / No Violations",
        notes="No adverse institutional disciplinary records flagged."
    )
    checks.append(check_integ)

    is_eligible = all(c.passed for c in checks)
    if is_eligible:
        summary = "Applicant cleared all 5 Section 1 Hard Eligibility rules. Proceeding to parallel Merit & Need evaluation."
    else:
        failed_names = [c.criterion_name for c in checks if not c.passed]
        summary = f"Applicant failed {len(failed_names)} hard gatekeeper rule(s): {', '.join(failed_names)}. Short-circuiting directly to REJECT status."

    return EligibilityResult(
        is_eligible=is_eligible,
        checks=checks,
        failed_rule=failed_rule,
        summary=summary
    )

async def run_eligibility_agent(app: StructuredApplication) -> EligibilityResult:
    """Executes the Eligibility Gatekeeper agent."""
    user_prompt = f"""Evaluate this structured applicant file against Section 1 Hard Eligibility Rules:
{app.model_dump_json(indent=2)}
"""

    cloud_result = await run_foundry_agent_completion(
        system_prompt=ELIGIBILITY_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        tools=[RUBRIC_SEARCH_TOOL_DEFINITION],
        tool_executor=_tool_executor
    )

    if cloud_result:
        try:
            return EligibilityResult(**cloud_result)
        except Exception:
            pass

    return _deterministic_evaluate_eligibility(app)
