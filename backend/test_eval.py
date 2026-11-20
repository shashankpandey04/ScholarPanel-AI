import asyncio
import json
from app.config import settings
from app.workflows.evaluation_workflow import workflow_runner

async def main():
    with open(settings.SAMPLES_PATH, "r", encoding="utf-8") as f:
        samples = json.load(f)

    for s in samples:
        print(f"=== Testing {s['full_name']} (Expected: {s['expected_category']}) ===")
        resp = await workflow_runner.execute(s["raw_submission_text"], s.get("metadata"))
        print(f"Decision: {resp.decision.decision}")
        print(f"Weighted Total: {resp.decision.weighted_total:.2f}")
        print(f"Eligibility is_eligible: {resp.eligibility.is_eligible}")
        print(f"Failed rule: {resp.eligibility.failed_rule.line_id if resp.eligibility.failed_rule else 'None'}")
        print(f"Breakdown count: {len(resp.breakdown)}")
        print(f"Cited Lines: {resp.decision.cited_rubric_lines}")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
