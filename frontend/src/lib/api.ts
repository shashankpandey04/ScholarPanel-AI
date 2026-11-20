export interface RubricLine {
  line_id: string;
  line_number: number;
  section: string;
  text: string;
}

export interface RubricCitation {
  line_id: string;
  quote: string;
  justification: string;
}

export interface RuleCheck {
  criterion_name: string;
  passed: boolean;
  rubric_line_id: string;
  verbatim_rubric_text: string;
  applicant_value: string;
  notes: string;
}

export interface EligibilityResult {
  is_eligible: boolean;
  checks: RuleCheck[];
  failed_rule: RubricCitation | null;
  summary: string;
}

export interface CriterionScore {
  name: string;
  max_points: number;
  raw_score: number;
  citation: RubricCitation;
}

export interface MeritResult {
  gpa_rigor: CriterionScore;
  research_leadership: CriterionScore;
  personal_statement: CriterionScore;
  merit_subtotal: number;
  summary: string;
}

export interface NeedResult {
  income_dependents: CriterionScore;
  special_circumstances_gap: CriterionScore;
  need_subtotal: number;
  summary: string;
}

export interface FinalDecision {
  decision: "AWARD" | "WAITLIST" | "REJECT";
  weighted_total: number;
  merit_subtotal: number;
  need_subtotal: number;
  merit_weight: number;
  need_weight: number;
  executive_synthesis: string;
  cited_rubric_lines: string[];
}

export interface CriterionBreakdownItem {
  section: string;
  criterion_name: string;
  max_score: number;
  raw_score: number;
  weight_percentage: number;
  weighted_points: number;
  citation_line_id: string;
  verbatim_quote: string;
  justification: string;
}

export interface AgentTraceItem {
  stage: string;
  agent_name: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "SHORT_CIRCUITED";
  duration_ms: number;
  timestamp: string;
  detail: string;
}

export interface StructuredApplication {
  applicant_id: string;
  full_name: string;
  gpa: number;
  enrollment_status: string;
  residency_status: string;
  annual_income: number;
  dependents: number;
  first_gen: boolean;
  achievements_summary: string;
  statement_of_purpose: string;
  financial_circumstances: string;
}

export interface EvaluationResponse {
  applicant: StructuredApplication;
  eligibility: EligibilityResult;
  merit: MeritResult | null;
  need: NeedResult | null;
  decision: FinalDecision;
  breakdown: CriterionBreakdownItem[];
  traces: AgentTraceItem[];
  total_duration_ms: number;
}

export interface StreamEvent {
  event_type: string;
  stage: string;
  agent: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "SHORT_CIRCUITED";
  message: string;
  payload?: any;
  timestamp: string;
}

export interface SampleApplication {
  applicant_id: string;
  full_name: string;
  email: string;
  raw_submission_text: string;
  expected_category: string;
  metadata?: Record<string, any>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string; azure_configured: boolean; rubric_lines_loaded: number }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchRubric(): Promise<{ lines: RubricLine[]; raw_markdown: string }> {
  const res = await fetch(`${API_BASE}/api/rubric`);
  if (!res.ok) throw new Error(`Failed to fetch rubric: ${res.statusText}`);
  return res.json();
}

export async function fetchSamples(): Promise<SampleApplication[]> {
  const res = await fetch(`${API_BASE}/api/samples`);
  if (!res.ok) throw new Error(`Failed to fetch samples: ${res.statusText}`);
  return res.json();
}

export async function evaluateApplication(rawSubmissionText: string, metadata?: Record<string, any>): Promise<EvaluationResponse> {
  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_submission_text: rawSubmissionText, metadata }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Evaluation failed: ${res.statusText}`);
  }
  return res.json();
}

export function evaluateApplicationStream(
  rawSubmissionText: string,
  onEvent: (event: StreamEvent) => void,
  onComplete: (response: EvaluationResponse) => void,
  onError: (err: any) => void,
  metadata?: Record<string, any>
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/evaluate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_submission_text: rawSubmissionText, metadata }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Stream request failed with status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error("No response body received from stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const blockLines = block.split("\n");
          let dataStr = "";
          for (const line of blockLines) {
            if (line.startsWith("data:")) {
              dataStr += line.substring(5).trim();
            }
          }
          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event_type === "WorkflowOutputEvent" && parsed.payload?.evaluation) {
                onComplete(parsed.payload.evaluation as EvaluationResponse);
              } else {
                onEvent(parsed as StreamEvent);
              }
            } catch (e) {
              console.warn("Failed to parse SSE line:", dataStr, e);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err);
      }
    });

  return () => controller.abort();
}
