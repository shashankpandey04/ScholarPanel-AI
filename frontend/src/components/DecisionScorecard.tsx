"use client";

import React, { useState } from "react";
import { EvaluationResponse } from "../lib/api";
import { 
  Award, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  FileCheck, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface DecisionScorecardProps {
  evaluation: EvaluationResponse;
}

export function DecisionScorecard({ evaluation }: DecisionScorecardProps) {
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [showGatekeeperDetails, setShowGatekeeperDetails] = useState(true);

  const { decision, eligibility, merit, need, breakdown, applicant, total_duration_ms } = evaluation;

  // Determine styling based on decision
  let badgeTheme = {
    bg: "bg-emerald-950/60 border-emerald-600/60 text-emerald-200",
    badge: "bg-emerald-600 text-white",
    text: "text-emerald-400",
    glow: "shadow-emerald-950/50",
    title: "SCHOLARSHIP AWARD CONFIRMED",
    icon: Award,
  };

  if (decision.decision === "WAITLIST") {
    badgeTheme = {
      bg: "bg-amber-950/60 border-amber-600/60 text-amber-200",
      badge: "bg-amber-600 text-white",
      text: "text-amber-400",
      glow: "shadow-amber-950/50",
      title: "PLACED ON COMPETITIVE WAITLIST",
      icon: Clock,
    };
  } else if (decision.decision === "REJECT") {
    badgeTheme = {
      bg: "bg-rose-950/60 border-rose-600/60 text-rose-200",
      badge: "bg-rose-600 text-white",
      text: "text-rose-400",
      glow: "shadow-rose-950/50",
      title: eligibility.is_eligible ? "APPLICATION REJECTED (BELOW THRESHOLD)" : "DISQUALIFIED AT ELIGIBILITY GATE",
      icon: XCircle,
    };
  }

  const DecisionIcon = badgeTheme.icon;

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(evaluation, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `evaluation_${applicant.applicant_id}_audit.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col space-y-5 font-sans">
      {/* Top Banner Decision Card */}
      <div className={`p-5 rounded-xl border ${badgeTheme.bg} shadow-lg ${badgeTheme.glow} transition-all`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${badgeTheme.badge}`}>
              <DecisionIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold tracking-tight ${badgeTheme.text}`}>
                  {decision.decision}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-900/80 border border-slate-700 text-slate-300">
                  {applicant.applicant_id} • {applicant.full_name}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {badgeTheme.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:border-l sm:border-slate-800 sm:pl-4">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Weighted Total Score
              </span>
              <span className="text-2xl font-black font-mono text-white">
                {eligibility.is_eligible ? decision.weighted_total.toFixed(2) : "0.00"}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">/ 100</span>
              </span>
            </div>

            <button
              onClick={handleExportJSON}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm flex items-center gap-1.5 text-xs font-semibold"
              title="Download Defensible JSON Audit Record"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Export Audit JSON</span>
            </button>
          </div>
        </div>

        {/* Score Weights Breakdown summary if eligible */}
        {eligibility.is_eligible && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
              <span className="text-slate-400 text-[10px] block">Merit Subtotal (55%)</span>
              <span className="font-mono font-bold text-blue-300 text-sm">
                {decision.merit_subtotal} pts
              </span>
              <span className="text-[10px] text-slate-500 block">
                +{(decision.merit_subtotal * 0.55).toFixed(2)} wt
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
              <span className="text-slate-400 text-[10px] block">Need Subtotal (45%)</span>
              <span className="font-mono font-bold text-emerald-300 text-sm">
                {decision.need_subtotal} pts
              </span>
              <span className="text-[10px] text-slate-500 block">
                +{(decision.need_subtotal * 0.45).toFixed(2)} wt
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
              <span className="text-slate-400 text-[10px] block">Formula Reference</span>
              <span className="font-mono text-[11px] text-slate-300 block font-semibold truncate">
                [RUBRIC-L40]
              </span>
              <span className="text-[10px] text-slate-500 block">
                M×0.55 + N×0.45
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
              <span className="text-slate-400 text-[10px] block">Pipeline Latency</span>
              <span className="font-mono text-[11px] text-indigo-300 block font-semibold">
                {(total_duration_ms / 1000).toFixed(2)}s
              </span>
              <span className="text-[10px] text-slate-500 block">
                Concurrent Fan-Out
              </span>
            </div>
          </div>
        )}

        {/* Executive Synthesis */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5" />
            Executive Committee Synthesis
          </div>
          <p className="text-slate-300 leading-relaxed text-xs">
            {decision.executive_synthesis}
          </p>
        </div>
      </div>

      {/* Gatekeeper Section 1 Eligibility Checks */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
        <button
          onClick={() => setShowGatekeeperDetails(!showGatekeeperDetails)}
          className="w-full p-3.5 bg-slate-950 flex items-center justify-between text-left hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Gatekeeper Section 1 Eligibility Checks
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                eligibility.is_eligible
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : "bg-rose-950 text-rose-300 border border-rose-700"
              }`}
            >
              {eligibility.is_eligible ? "ALL RULES PASSED" : "DISQUALIFIED"}
            </span>
          </div>
          {showGatekeeperDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showGatekeeperDetails && (
          <div className="p-3.5 border-t border-slate-800 space-y-2">
            {eligibility.checks.map((chk, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  chk.passed
                    ? "bg-slate-900/60 border-slate-800/80"
                    : "bg-rose-950/30 border-rose-700/80"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{chk.criterion_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {chk.rubric_line_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 italic">
                      "{chk.verbatim_rubric_text}"
                    </p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      <strong className="text-slate-400">Finding:</strong> {chk.notes}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">Applicant Value</span>
                  <span className="font-mono font-semibold text-slate-200 text-xs">
                    {chk.applicant_value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Criterion Breakdown Table (if eligible) */}
      {eligibility.is_eligible && breakdown.length > 0 && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Scored Rubric Criteria & Auditable Citations
            </h3>
            <span className="text-[11px] text-slate-400">
              5 Distinct Sub-Criteria Scored
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Criterion & Section</th>
                  <th className="py-2.5 px-3 text-center">Raw Score</th>
                  <th className="py-2.5 px-3 text-center">Weight</th>
                  <th className="py-2.5 px-3 text-center">Contribution</th>
                  <th className="py-2.5 px-3">Rubric Citation</th>
                  <th className="py-2.5 px-3">Agent Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">{item.criterion_name}</span>
                      <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wide">
                        {item.section}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                      {item.raw_score} <span className="text-slate-500 font-normal">/ {item.max_score}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {item.weight_percentage}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-300">
                      +{item.weighted_points.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() =>
                          setSelectedCitation(
                            selectedCitation === item.citation_line_id ? null : item.citation_line_id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 transition-colors cursor-pointer"
                      >
                        {item.citation_line_id}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                      {selectedCitation === item.citation_line_id && (
                        <div className="mt-1 p-2 bg-slate-950 border border-indigo-800/80 rounded text-[11px] text-slate-300 italic shadow-lg">
                          "{item.verbatim_quote}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs leading-relaxed">
                      {item.justification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cited Rubric Line IDs Summary Footer */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 text-[11px]">Audit Line Registry:</span>
          <div className="flex flex-wrap gap-1">
            {decision.cited_rubric_lines.map((lineId) => (
              <span
                key={lineId}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
              >
                {lineId}
              </span>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-slate-500">
          Generated via Microsoft Agent Framework & Azure OpenAI
        </span>
      </div>
    </div>
  );
}
