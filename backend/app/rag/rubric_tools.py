from typing import Any
from app.rag.rubric_store import rubric_store

def search_rubric(query: str, section: str | None = None, top_k: int = 5) -> list[dict[str, Any]]:
    """Tool function for AI agents to query official published rubric rules, bands, and weights.
    
    Args:
        query: Specific criterion or keyword to search (e.g., 'GPA eligibility', 'Band A research', 'income ratio')
        section: Optional section filter: 'Eligibility', 'Merit', 'Need', or 'Thresholds'
        top_k: Maximum number of rubric line matches to return
    """
    return rubric_store.search(query=query, section=section, top_k=top_k)

def get_rubric_line(line_id: str) -> dict[str, Any] | None:
    """Tool function to retrieve an exact rubric line by its ID (e.g. RUBRIC-L04)."""
    return rubric_store.get_by_id(line_id)

def get_rubric_section(section: str) -> list[dict[str, Any]]:
    """Retrieve all lines belonging to an official rubric section."""
    return rubric_store.get_section(section)

# OpenAI / Foundry function schema definition
RUBRIC_SEARCH_TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name": "search_rubric",
        "description": "Searches the official published scholarship rubric for line IDs, criteria, scoring bands, and formulas.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term or requirement (e.g. 'minimum GPA', 'research impact', 'household income cap', 'decision formula')"
                },
                "section": {
                    "type": "string",
                    "enum": ["Eligibility", "Merit", "Need", "Thresholds"],
                    "description": "The specific section of the published rubric to target."
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of rubric lines to retrieve (default 5)."
                }
            },
            "required": ["query"]
        }
    }
}
