"use client";

import React, { useState } from "react";
import { EvaluationResponse } from "../lib/api";
import { Download, ChevronDown, ChevronUp } from "lucide-react";

interface DecisionScorecardProps {
  evaluation: EvaluationResponse;
}

export function DecisionScorecard({ evaluation }: DecisionScorecardProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showEligibility, setShowEligibility] = useState(true);

  const { decision, eligibility, breakdown, applicant, total_duration_ms } = evaluation;

  const verdictStyle =
    decision.decision === "AWARD"
      ? "text-emerald-800 bg-emerald-50 border-emerald-200"
      : decision.decision === "WAITLIST"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-rose-800 bg-rose-50 border-rose-200";

  const handleExport = () => {
    const uri =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(evaluation, null, 2));
    const link = document.createElement("a");
    link.href = uri;
    link.download = `audit_${applicant.applicant_id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg text-slate-900 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded border font-mono text-xs font-bold tracking-wide ${verdictStyle}`}
              >
                {decision.decision}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {applicant.applicant_id} · {applicant.full_name}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
              {eligibility.is_eligible
                ? `Weighted Score: ${decision.weighted_total.toFixed(2)} / 100`
                : "Ineligible Under Section 1 Rules"}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-800 transition-colors self-start cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>
        </div>

        {eligibility.is_eligible && (
          <div className="mt-6 grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-md bg-slate-50/50">
            <div className="p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Merit (55%)
              </div>
              <div className="mt-1 font-mono text-base font-bold text-slate-900">
                {decision.merit_subtotal}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({(decision.merit_subtotal * 0.55).toFixed(2)} pts)
                </span>
              </div>
            </div>

            <div className="p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Need (45%)
              </div>
              <div className="mt-1 font-mono text-base font-bold text-slate-900">
                {decision.need_subtotal}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({(decision.need_subtotal * 0.45).toFixed(2)} pts)
                </span>
              </div>
            </div>

            <div className="p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Elapsed
              </div>
              <div className="mt-1 font-mono text-base font-bold text-slate-900">
                {(total_duration_ms / 1000).toFixed(2)}s
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
            Committee Summary
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {decision.executive_synthesis}
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <button
          type="button"
          onClick={() => setShowEligibility(!showEligibility)}
          className="w-full px-6 py-3.5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Eligibility Screening
            </span>
            <span
              className={`font-mono text-[11px] font-semibold ${
                eligibility.is_eligible ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {eligibility.is_eligible ? "Passed" : "Failed"}
            </span>
          </div>
          {showEligibility ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showEligibility && (
          <div className="divide-y divide-slate-100 px-6">
            {eligibility.checks.map((chk, i) => (
              <div
                key={i}
                className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">
                      {chk.criterion_name}
                    </span>
                    <span className="font-mono text-[11px] text-indigo-700">
                      {chk.rubric_line_id}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold uppercase ${
                        chk.passed ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {chk.passed ? "Pass" : "Fail"}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{chk.notes}</p>
                </div>

                <div className="font-mono text-xs text-slate-700 shrink-0">
                  {chk.applicant_value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {eligibility.is_eligible && breakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-6">Criterion</th>
                <th className="py-3 px-4 text-right">Raw</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4 text-right">Weighted</th>
                <th className="py-3 px-4">Citation</th>
                <th className="py-3 px-6">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdown.map((item, idx) => {
                const key = `${item.citation_line_id}-${idx}`;
                const open = expandedRule === key;
                return (
                  <tr key={key} className="align-top hover:bg-slate-50/50">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">
                        {item.criterion_name}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
                        {item.section}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {item.raw_score}/{item.max_score}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                      {item.weight_percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      +{item.weighted_points.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setExpandedRule(open ? null : key)}
                        className="font-mono text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                      >
                        {item.citation_line_id}
                      </button>
                      {open && item.verbatim_quote && (
                        <p className="mt-1.5 max-w-xs text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200 rounded p-2 whitespace-normal">
                          &ldquo;{item.verbatim_quote}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 leading-relaxed max-w-md">
                      {item.justification}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {decision.cited_rubric_lines?.length > 0 && (
        <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="font-mono truncate">
            Referenced: {decision.cited_rubric_lines.join(", ")}
          </div>
          <span className="shrink-0">Rubric-grounded output</span>
        </div>
      )}
    </section>
  );
}