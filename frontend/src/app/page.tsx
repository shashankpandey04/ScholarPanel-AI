"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { fetchHealth, fetchRubric, RubricLine } from "../lib/api";

const STAGES = [
  {
    number: "01",
    title: "Intake Normalization",
    detail: "Structures raw applicant text and transcripts into validated fields so downstream agents read consistent facts.",
  },
  {
    number: "02",
    title: "Eligibility Gatekeeper",
    detail: "Checks mandatory Section 1 rules first. Ineligible applications stop immediately with a clear reason.",
  },
  {
    number: "03",
    title: "Parallel Merit & Need Review",
    detail: "Academic merit (55% weight) and financial need (45% weight) are scored independently with line citations.",
  },
  {
    number: "04",
    title: "Panel Decision & Audit Log",
    detail: "Applies fixed thresholds (Award ≥ 78, Waitlist 60–77.9, Reject < 60) and exports a complete record.",
  },
];

const CASES = [
  {
    id: "APP-2026-001",
    name: "Aarav Sharma",
    verdict: "AWARD",
    verdictClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    score: "93.10",
    merit: "94",
    need: "92",
    summary: "3.92 GPA, IEEE research, first-generation student with high documented financial need.",
  },
  {
    id: "APP-2026-002",
    name: "Priya Nair",
    verdict: "WAITLIST",
    verdictClass: "text-amber-800 bg-amber-50 border-amber-200",
    score: "66.70",
    merit: "73",
    need: "59",
    summary: "3.48 GPA in Biomedical Sciences with lab experience and moderate unmet tuition gap.",
  },
  {
    id: "APP-2026-003",
    name: "Rohan Verma",
    verdict: "REJECT",
    verdictClass: "text-rose-700 bg-rose-50 border-rose-200",
    score: "0.00",
    merdict: "—",
    need: "—",
    summary: "2.78 GPA falls below the mandatory 3.00 minimum [RUBRIC-L04]; halted at eligibility gate.",
  },
];

export default function LandingPage() {
  const [rubricCount, setRubricCount] = useState<number>(44);
  const [showRubric, setShowRubric] = useState(false);
  const [lines, setLines] = useState<RubricLine[]>([]);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");

  useEffect(() => {
    fetchHealth()
      .then((h) => {
        if (h?.rubric_lines_loaded) setRubricCount(h.rubric_lines_loaded);
      })
      .catch(() => {});
  }, []);

  const openRubric = async () => {
    setShowRubric(true);
    if (lines.length === 0) {
      try {
        const res = await fetchRubric();
        setLines(res.lines || []);
      } catch (err) {
        console.error("Failed to fetch rubric:", err);
      }
    }
  };

  const filtered = lines.filter((item) => {
    const q = query.toLowerCase();
    const matchesText =
      item.line_id.toLowerCase().includes(q) || item.text.toLowerCase().includes(q);
    const matchesSec =
      section === "All" || item.section.toLowerCase().includes(section.toLowerCase());
    return matchesText && matchesSec;
  });

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <p className="font-mono text-xs uppercase tracking-widest text-indigo-700 font-semibold mb-4">
              Committee Decision System
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-slate-900 leading-[1.08]">
              Clear, defensible scholarship decisions grounded in your rubric.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              ScholarPanel AI screens eligibility rules first, scores academic merit and financial need in parallel, and computes final totals deterministically—with line-by-line citations on every result.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/evaluate"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-slate-900 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                <span>Start an Evaluation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={openRubric}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Read Rubric ({rubricCount} lines)</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-8 lg:pt-0 lg:pl-8 space-y-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Score Weighting
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
                55% Merit / 45% Need
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Calculated in code after specialist scoring completes.
              </p>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Award Threshold
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
                78.00 / 100
              </div>
              <p className="text-xs text-slate-500 mt-1">
                60.00–77.99 Waitlist · Below 60.00 Reject.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-slate-200 bg-slate-50/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How a review moves from dossier to verdict
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Four focused steps keep screening rules separate from scoring and final aggregation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-slate-200 bg-white">
            {STAGES.map((stage) => (
              <div
                key={stage.number}
                className="p-6 border-r border-b border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-indigo-700">
                    {stage.number}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {stage.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="rubric" className="border-b border-slate-200 bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Citations tied to exact rubric lines
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Every eligibility check and score contribution references a numbered line from the published rubric so committee members and applicants can verify how a number was reached.
            </p>
            <button
              type="button"
              onClick={openRubric}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
            >
              <span>Open searchable rubric</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-7 divide-y divide-slate-200 border-t border-b border-slate-200">
            {[
              {
                id: "RUBRIC-L04",
                label: "Minimum GPA",
                text: "Cumulative GPA must be at least 3.00 on a 4.00 scale; below 3.00 is ineligible.",
              },
              {
                id: "RUBRIC-L11",
                label: "Academic Merit Band A",
                text: "GPA 3.85–4.00 with honors or research rigor qualifies for the top merit band.",
              },
              {
                id: "RUBRIC-L28",
                label: "Financial Need Band A",
                text: "Household income at or below $30,000 with 3 or more dependents reflects highest need.",
              },
              {
                id: "RUBRIC-L40",
                label: "Final Weighted Formula",
                text: "Weighted Total = (Merit Subtotal × 0.55) + (Need Subtotal × 0.45).",
              },
            ].map((row) => (
              <div key={row.id} className="py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                <span className="font-mono text-xs font-semibold text-slate-500 shrink-0 w-28">
                  {row.id}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{row.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cases" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Sample evaluation outcomes
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Open any sample profile directly in the evaluation workspace.
              </p>
            </div>
            <Link
              href="/evaluate"
              className="text-sm font-semibold text-slate-900 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>Custom applicant</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4 text-right">Merit</th>
                  <th className="py-3 px-4 text-right">Need</th>
                  <th className="py-3 px-4 text-right">Final Score</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {CASES.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{c.id}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${c.verdictClass}`}
                      >
                        {c.verdict}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700">{c.merit}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700">{c.need}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      {c.score}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 max-w-sm">
                      {c.summary}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/evaluate?sample=${c.id}`}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showRubric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[82vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Published Rubric</h3>
                <p className="text-xs text-slate-500">Line-indexed rules and scoring thresholds</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRubric(false)}
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by line ID or keyword..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="flex items-center gap-1">
                {["All", "Eligibility", "Merit", "Need", "Thresholds"].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSection(sec)}
                    className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                      section === sec
                        ? "bg-slate-900 text-white font-medium"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-6">
              {filtered.map((item) => (
                <div key={item.line_id} className="py-3 flex items-start gap-4 text-xs">
                  <span className="font-mono font-semibold text-indigo-700 shrink-0 w-24">
                    {item.line_id}
                  </span>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {item.section}
                    </div>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}