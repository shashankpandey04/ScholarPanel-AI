import json
import re
from typing import Any
from app.schemas import StructuredApplication
from app.agents.openai_responses_client import run_agent_with_responses_api

INTAKE_SYSTEM_PROMPT = """You are the official Admissions Intake Specialist for the Global Excellence and Opportunity Scholarship Committee.
Your role is to strictly normalize, extract, and validate raw, unstructured application text and dossier fragments into a formal, structured JSON schema.

Extracted Fields:
- applicant_id: string (e.g. APP-2026-xxx or generate one if missing)
- full_name: string (full legal name)
- gpa: float (cumulative GPA on 4.0 scale)
- enrollment_status: string ("Full-Time", "Part-Time", or "Non-Degree")
- residency_status: string ("Citizen", "Permanent Resident", or "Visa Holder")
- annual_income: float (verified annual household income in USD)
- dependents: integer (number of legal family dependents)
- first_gen: boolean (true if first in family to attend college, false otherwise)
- achievements_summary: string (synthesized summary of research, leadership, publications, extracurriculars)
- statement_of_purpose: string (synthesized summary of educational goals and aspirations)
- financial_circumstances: string (synthesized summary of economic hardship, unmet tuition gap, or family adversity)

You must output ONLY a valid JSON object matching the schema. No markdown formatting outside of JSON.
"""

def _deterministic_extract(raw_text: str, metadata: dict[str, Any] | None = None) -> StructuredApplication:
    """Deterministic extractor fallback when running locally or parsing structured data."""
    meta = metadata or {}

    # Extract GPA
    gpa = meta.get("target_gpa")
    if gpa is None:
        gpa_match = re.search(r"GPA(?:\s+of)?[:\s]+([0-4]\.\d{1,2})", raw_text, re.IGNORECASE)
        gpa = float(gpa_match.group(1)) if gpa_match else 3.50

    # Extract Name
    name = meta.get("full_name")
    if not name:
        name_match = re.search(r"(?:Profile:\s*|Applicant:\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", raw_text)
        name = name_match.group(1).strip() if name_match else "Scholar Candidate"

    # Extract ID
    app_id = meta.get("applicant_id")
    if not app_id:
        id_match = re.search(r"APP-\d{4}-\d+", raw_text)
        app_id = id_match.group(0) if id_match else "APP-2026-001"

    # Enrollment
    enrollment = meta.get("enrollment_status")
    if not enrollment:
        if "part-time" in raw_text.lower():
            enrollment = "Part-Time"
        elif "non-degree" in raw_text.lower():
            enrollment = "Non-Degree"
        else:
            enrollment = "Full-Time"

    # Residency
    residency = meta.get("residency_status")
    if not residency:
        if "citizen" in raw_text.lower():
            residency = "Citizen"
        elif "permanent resident" in raw_text.lower():
            residency = "Permanent Resident"
        else:
            residency = "Citizen / Permanent Resident"

    # Income
    income = meta.get("annual_income")
    if income is None:
        inc_match = re.search(r"\$([0-9]{1,3}(?:,[0-9]{3})*)", raw_text)
        if inc_match:
            income = float(inc_match.group(1).replace(",", ""))
        else:
            income = 45000.0

    # Dependents
    dependents = meta.get("dependents")
    if dependents is None:
        dep_match = re.search(r"(\d+)\s+(?:family\s+)?dependents", raw_text, re.IGNORECASE)
        dependents = int(dep_match.group(1)) if dep_match else 3

    # First Gen
    first_gen = meta.get("first_gen")
    if first_gen is None:
        first_gen = "first-generation" in raw_text.lower() or "first gen" in raw_text.lower()

    return StructuredApplication(
        applicant_id=str(app_id),
        full_name=str(name),
        gpa=float(gpa),
        enrollment_status=str(enrollment),
        residency_status=str(residency),
        annual_income=float(income),
        dependents=int(dependents),
        first_gen=bool(first_gen),
        achievements_summary="Extracted academic rigor, research initiatives, and extracurricular commitments.",
        statement_of_purpose="Articulated academic pursuits and vision for educational and career advancement.",
        financial_circumstances="Documented household financial standing and tuition funding obligations."
    )

async def run_intake_agent(raw_text: str, metadata: dict[str, Any] | None = None) -> StructuredApplication:
    """Executes Intake Agent on raw applicant dossier using OpenAI Responses API."""
    cloud_result = await run_agent_with_responses_api(
        instructions=INTAKE_SYSTEM_PROMPT,
        input_text=f"Raw Applicant Submission:\n{raw_text}\n\nPre-filled Metadata:\n{json.dumps(metadata or {})}"
    )

    if cloud_result:
        try:
            return StructuredApplication(**cloud_result)
        except Exception:
            pass

    return _deterministic_extract(raw_text, metadata)
