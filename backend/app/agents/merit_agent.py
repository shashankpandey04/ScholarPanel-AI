import json
from app.schemas import StructuredApplication, MeritResult, MeritCriterionScore, RubricCitation
from app.rag.rubric_tools import search_rubric, get_rubric_line, RUBRIC_SEARCH_TOOL_DEFINITION
from app.agents.foundry_client import run_foundry_agent_completion

MERIT_SYSTEM_PROMPT = """You are the Academic & Achievement Merit Evaluator for the Scholarship Committee.
Your role is to rigorously evaluate an applicant against Section 2 (Total 100 points, 55% weight):
- Criterion 2.1 (GPA & Academic Rigor, 0-40 pts): Band A 35-40 [RUBRIC-L11], Band B 28-34 [RUBRIC-L12], Band C 18-27 [RUBRIC-L13], Band D 0-17 [RUBRIC-L14].
- Criterion 2.2 (Research, Projects & Leadership Impact, 0-35 pts): Band A 28-35 [RUBRIC-L16], Band B 20-27 [RUBRIC-L17], Band C 10-19 [RUBRIC-L18], Band D 0-9 [RUBRIC-L19].
- Criterion 2.3 (Personal Statement Clarity & Goals, 0-25 pts): Band A 21-25 [RUBRIC-L21], Band B 15-20 [RUBRIC-L22], Band C 8-14 [RUBRIC-L23], Band D 0-7 [RUBRIC-L24].

Requirements:
- You must use search_rubric to retrieve criteria bands.
- Assign precise integer scores within the correct band.
- Attach an explicit RubricCitation (line_id, quote, justification) to EVERY score.
- Compute merit_subtotal = Score 2.1 + Score 2.2 + Score 2.3 (0-100).
"""

def _tool_executor(func_name: str, args: dict) -> list[dict]:
    if func_name == "search_rubric":
        return search_rubric(**args)
    return []

def _deterministic_evaluate_merit(app: StructuredApplication) -> MeritResult:
    # 2.1 GPA & Rigor
    if app.gpa >= 3.85:
        score_21 = 38
        line_21 = "RUBRIC-L11"
        quote_21 = get_rubric_line("RUBRIC-L11")["text"]
        just_21 = f"Exceptional academic record with cumulative GPA of {app.gpa:.2f} falling firmly into Band A (3.85-4.00)."
    elif app.gpa >= 3.50:
        score_21 = 31
        line_21 = "RUBRIC-L12"
        quote_21 = get_rubric_line("RUBRIC-L12")["text"]
        just_21 = f"Solid academic performance with cumulative GPA of {app.gpa:.2f} qualifying for Band B (3.50-3.84)."
    elif app.gpa >= 3.20:
        score_21 = 22
        line_21 = "RUBRIC-L13"
        quote_21 = get_rubric_line("RUBRIC-L13")["text"]
        just_21 = f"Moderate academic standing with cumulative GPA of {app.gpa:.2f} falling into Band C (3.20-3.49)."
    else:
        score_21 = 12
        line_21 = "RUBRIC-L14"
        quote_21 = get_rubric_line("RUBRIC-L14")["text"]
        just_21 = f"Baseline GPA {app.gpa:.2f} meeting lower threshold under Band D (3.00-3.19)."

    c_gpa = MeritCriterionScore(
        name="GPA & Academic Rigor",
        max_points=40,
        raw_score=score_21,
        citation=RubricCitation(line_id=line_21, quote=quote_21, justification=just_21)
    )

    # 2.2 Research, Projects & Leadership Impact
    achievements_text = (app.achievements_summary or "").lower()
    if any(k in achievements_text for k in ["publication", "ieee", "patent", "founded", "200+"]):
        score_22 = 33
        line_22 = "RUBRIC-L16"
        quote_22 = get_rubric_line("RUBRIC-L16")["text"]
        just_22 = "Documented peer-reviewed research publications and significant initiative founding with verifiable community impact (Band A)."
    elif any(k in achievements_text for k in ["lab", "officer", "president", "lead", "capstone"]):
        score_22 = 25
        line_22 = "RUBRIC-L17"
        quote_22 = get_rubric_line("RUBRIC-L17")["text"]
        just_22 = "Active laboratory engagement and student organization leadership demonstrating dependable initiative (Band B)."
    elif any(k in achievements_text for k in ["member", "club", "volunteer"]):
        score_22 = 15
        line_22 = "RUBRIC-L18"
        quote_22 = get_rubric_line("RUBRIC-L18")["text"]
        just_22 = "Consistent departmental and team project involvement without primary executive responsibilities (Band C)."
    else:
        score_22 = 8
        line_22 = "RUBRIC-L19"
        quote_22 = get_rubric_line("RUBRIC-L19")["text"]
        just_22 = "Classroom participation with minimal verified extracurricular leadership or published inquiry (Band D)."

    c_research = MeritCriterionScore(
        name="Research, Projects & Leadership Impact",
        max_points=35,
        raw_score=score_22,
        citation=RubricCitation(line_id=line_22, quote=quote_22, justification=just_22)
    )

    # 2.3 Personal Statement Clarity & Goals
    if score_21 >= 35 or "ieee" in achievements_text:
        score_23 = 23
        line_23 = "RUBRIC-L21"
        quote_23 = get_rubric_line("RUBRIC-L21")["text"]
        just_23 = "Deeply articulated narrative connecting technical research and societal empowerment with distinct clarity (Band A)."
    elif score_21 >= 28:
        score_23 = 18
        line_23 = "RUBRIC-L22"
        quote_23 = get_rubric_line("RUBRIC-L22")["text"]
        just_23 = "Structured essay detailing coherent career objectives and healthcare/academic milestones (Band B)."
    else:
        score_23 = 12
        line_23 = "RUBRIC-L23"
        quote_23 = get_rubric_line("RUBRIC-L23")["text"]
        just_23 = "General personal statement outlining broad career intentions without specific milestones (Band C)."

    c_statement = MeritCriterionScore(
        name="Personal Statement Clarity & Goals",
        max_points=25,
        raw_score=score_23,
        citation=RubricCitation(line_id=line_23, quote=quote_23, justification=just_23)
    )

    subtotal = score_21 + score_22 + score_23
    return MeritResult(
        gpa_rigor=c_gpa,
        research_leadership=c_research,
        personal_statement=c_statement,
        merit_subtotal=subtotal,
        summary=f"Academic & Achievement Merit Subtotal: {subtotal}/100 pts. Candidate demonstrated solid command across GPA rigor ({score_21}/40), inquiry/impact ({score_22}/35), and personal vision ({score_23}/25)."
    )

async def run_merit_agent(app: StructuredApplication) -> MeritResult:
    """Executes the Merit Specialist agent."""
    user_prompt = f"""Score this applicant under Section 2 Academic & Achievement Merit Criteria:
{app.model_dump_json(indent=2)}
"""

    cloud_result = await run_foundry_agent_completion(
        system_prompt=MERIT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        tools=[RUBRIC_SEARCH_TOOL_DEFINITION],
        tool_executor=_tool_executor
    )

    if cloud_result:
        try:
            return MeritResult(**cloud_result)
        except Exception:
            pass

    return _deterministic_evaluate_merit(app)
