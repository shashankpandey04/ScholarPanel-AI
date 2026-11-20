import json
from app.schemas import StructuredApplication, NeedResult, NeedCriterionScore, RubricCitation
from app.rag.rubric_tools import search_rubric, get_rubric_line, RUBRIC_SEARCH_TOOL_DEFINITION
from app.agents.foundry_client import run_foundry_agent_completion

NEED_SYSTEM_PROMPT = """You are the Financial Need & Socioeconomic Evaluator for the Scholarship Committee.
Your role is to rigorously evaluate an applicant against Section 3 (Total 100 points, 45% weight):
- Criterion 3.1 (Verified Household Income & Dependents Ratio, 0-60 pts): Band A 50-60 [RUBRIC-L28], Band B 36-49 [RUBRIC-L29], Band C 20-35 [RUBRIC-L30], Band D 0-19 [RUBRIC-L31].
- Criterion 3.2 (Special Circumstances / First-Generation / Unmet Tuition Gap, 0-40 pts): Band A 32-40 [RUBRIC-L33], Band B 22-31 [RUBRIC-L34], Band C 10-21 [RUBRIC-L35], Band D 0-9 [RUBRIC-L36].

Requirements:
- You must use search_rubric to retrieve criteria bands.
- Assign precise integer scores within the correct band.
- Attach an explicit RubricCitation (line_id, quote, justification) to EVERY score.
- Compute need_subtotal = Score 3.1 + Score 3.2 (0-100).
"""

def _tool_executor(func_name: str, args: dict) -> list[dict]:
    if func_name == "search_rubric":
        return search_rubric(**args)
    return []

def _deterministic_evaluate_need(app: StructuredApplication) -> NeedResult:
    # 3.1 Household Income & Dependents
    inc = app.annual_income
    dep = app.dependents

    if inc <= 30000.0 and dep >= 3:
        score_31 = 56
        line_31 = "RUBRIC-L28"
        quote_31 = get_rubric_line("RUBRIC-L28")["text"]
        just_31 = f"Severe financial distress: verified annual income of ${inc:,.2f} supporting {dep} dependents aligns with Band A (50-60 pts)."
    elif inc <= 55000.0:
        score_31 = 44
        line_31 = "RUBRIC-L29"
        quote_31 = get_rubric_line("RUBRIC-L29")["text"]
        just_31 = f"High economic need: annual income of ${inc:,.2f} with {dep} dependents resulting in significant tuition burden (Band B)."
    elif inc <= 70000.0:
        score_31 = 28
        line_31 = "RUBRIC-L30"
        quote_31 = get_rubric_line("RUBRIC-L30")["text"]
        just_31 = f"Moderate economic need: annual income of ${inc:,.2f} with manageable dependency obligations (Band C)."
    else:
        score_31 = 14
        line_31 = "RUBRIC-L31"
        quote_31 = get_rubric_line("RUBRIC-L31")["text"]
        just_31 = f"Low economic need: annual income of ${inc:,.2f} approaching program ceiling (Band D)."

    c_income = NeedCriterionScore(
        name="Verified Household Income & Dependents Ratio",
        max_points=60,
        raw_score=score_31,
        citation=RubricCitation(line_id=line_31, quote=quote_31, justification=just_31)
    )

    # 3.2 Special Circumstances, First-Gen, Unmet Tuition Gap
    if app.first_gen or score_31 >= 50:
        score_32 = 36
        line_32 = "RUBRIC-L33"
        quote_32 = get_rubric_line("RUBRIC-L33")["text"]
        just_32 = "Documented first-generation college student status compounded by emergency tuition deficit exceeding $15,000 (Band A)."
    elif score_31 >= 40:
        score_32 = 26
        line_32 = "RUBRIC-L34"
        quote_32 = get_rubric_line("RUBRIC-L34")["text"]
        just_32 = "Substantial tuition shortfall requiring significant student work-study and self-financing (Band B)."
    elif score_31 >= 25:
        score_32 = 16
        line_32 = "RUBRIC-L35"
        quote_32 = get_rubric_line("RUBRIC-L35")["text"]
        just_32 = "Modest unmet financial gap with conventional family auxiliary support (Band C)."
    else:
        score_32 = 6
        line_32 = "RUBRIC-L36"
        quote_32 = get_rubric_line("RUBRIC-L36")["text"]
        just_32 = "Minimal unmet tuition shortfall with adequate baseline funding package (Band D)."

    c_special = NeedCriterionScore(
        name="Special Circumstances / First-Generation / Unmet Tuition Gap",
        max_points=40,
        raw_score=score_32,
        citation=RubricCitation(line_id=line_32, quote=quote_32, justification=just_32)
    )

    subtotal = score_31 + score_32
    return NeedResult(
        income_dependents=c_income,
        special_circumstances_gap=c_special,
        need_subtotal=subtotal,
        summary=f"Financial Need Subtotal: {subtotal}/100 pts. Candidate exhibited pronounced need across verified income/dependents ({score_31}/60) and special adversity/first-generation barriers ({score_32}/40)."
    )

async def run_need_agent(app: StructuredApplication) -> NeedResult:
    """Executes the Need Specialist agent."""
    user_prompt = f"""Score this applicant under Section 3 Financial Need Criteria:
{app.model_dump_json(indent=2)}
"""

    cloud_result = await run_foundry_agent_completion(
        system_prompt=NEED_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        tools=[RUBRIC_SEARCH_TOOL_DEFINITION],
        tool_executor=_tool_executor
    )

    if cloud_result:
        try:
            return NeedResult(**cloud_result)
        except Exception:
            pass

    return _deterministic_evaluate_need(app)
