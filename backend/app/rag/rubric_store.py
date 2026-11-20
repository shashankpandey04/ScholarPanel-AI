import re
import math
from typing import Any
from app.config import settings

class RubricLine:
    def __init__(self, line_id: str, line_number: int, section: str, text: str):
        self.line_id = line_id
        self.line_number = line_number
        self.section = section
        self.text = text

    def to_dict(self) -> dict[str, Any]:
        return {
            "line_id": self.line_id,
            "line_number": self.line_number,
            "section": self.section,
            "text": self.text,
        }

class RubricStore:
    def __init__(self, rubric_file_path: str | None = None):
        self.rubric_file_path = rubric_file_path or settings.RUBRIC_PATH
        self.lines: list[RubricLine] = []
        self.line_map: dict[str, RubricLine] = {}
        self._load_and_chunk()

    def _determine_section(self, line_text: str, current_section: str) -> str:
        text_lower = line_text.lower()
        if "section 1" in text_lower or "eligibility" in text_lower:
            return "Eligibility"
        elif "section 2" in text_lower or "merit" in text_lower:
            return "Merit"
        elif "section 3" in text_lower or "need" in text_lower:
            return "Need"
        elif "section 4" in text_lower or "thresholds" in text_lower or "weights" in text_lower:
            return "Thresholds"
        return current_section

    def _load_and_chunk(self):
        try:
            with open(self.rubric_file_path, "r", encoding="utf-8") as f:
                content = f.readlines()
        except FileNotFoundError:
            content = []

        current_section = "General"
        line_num = 0
        pattern = re.compile(r"\[(RUBRIC-L\d+)\]\s*(.*)")

        for raw_line in content:
            stripped = raw_line.strip()
            if not stripped:
                continue

            if stripped.startswith("## Section"):
                current_section = self._determine_section(stripped, current_section)
                continue

            match = pattern.match(stripped)
            if match:
                line_id = match.group(1)
                text = match.group(2).strip()
                line_num += 1
                rubric_line = RubricLine(
                    line_id=line_id,
                    line_number=line_num,
                    section=current_section,
                    text=text
                )
                self.lines.append(rubric_line)
                self.line_map[line_id] = rubric_line
            elif stripped.startswith("[RUBRIC-"):
                parts = stripped.split("]", 1)
                line_id = parts[0].replace("[", "").strip()
                text = parts[1].strip() if len(parts) > 1 else ""
                line_num += 1
                rubric_line = RubricLine(
                    line_id=line_id,
                    line_number=line_num,
                    section=current_section,
                    text=text
                )
                self.lines.append(rubric_line)
                self.line_map[line_id] = rubric_line

    def _lexical_similarity(self, query: str, target: str) -> float:
        q_tokens = set(re.findall(r"\w+", query.lower()))
        t_tokens = re.findall(r"\w+", target.lower())
        if not q_tokens or not t_tokens:
            return 0.0

        matches = sum(1 for t in t_tokens if t in q_tokens)
        score = matches / (math.sqrt(len(q_tokens)) * math.sqrt(len(t_tokens)) + 1e-6)
        
        # Keyword booster
        boost_terms = ["gpa", "income", "threshold", "full-time", "dependents", "merit", "need", "award", "waitlist", "reject"]
        for term in boost_terms:
            if term in query.lower() and term in target.lower():
                score += 0.4
        return score

    def search(self, query: str, section: str | None = None, top_k: int = 5) -> list[dict[str, Any]]:
        candidates = self.lines
        if section:
            s_lower = section.lower()
            candidates = [l for l in self.lines if s_lower in l.section.lower()]

        if not candidates:
            return []

        scored = [(self._lexical_similarity(query, c.text), c) for c in candidates]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [c.to_dict() for _, c in scored[:top_k]]

    def get_by_id(self, line_id: str) -> dict[str, Any] | None:
        cand = self.line_map.get(line_id)
        return cand.to_dict() if cand else None

    def get_all(self) -> list[dict[str, Any]]:
        return [l.to_dict() for l in self.lines]

    def get_section(self, section: str) -> list[dict[str, Any]]:
        s_lower = section.lower()
        return [l.to_dict() for l in self.lines if s_lower in l.section.lower()]

# Global singleton
rubric_store = RubricStore()
