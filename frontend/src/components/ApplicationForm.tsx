"use client";

import React, { useState, useEffect } from "react";
import { SampleApplication, RubricLine, fetchRubric } from "../lib/api";
import { BookOpen, Search, X, Loader2 } from "lucide-react";

interface ApplicationFormProps {
  samples: SampleApplication[];
  onEvaluate: (submissionText: string, metadata?: Record<string, any>) => void;
  isRunning: boolean;
}

export function ApplicationForm({
  samples,
  onEvaluate,
  isRunning,
}: ApplicationFormProps) {
  const [selectedSample, setSelectedSample] = useState<SampleApplication | null>(null);
  const [rawText, setRawText] = useState("");
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricLines, setRubricLines] = useState<RubricLine[]>([]);
  const [rubricSearch, setRubricSearch] = useState("");
  const [rubricFilterSection, setRubricFilterSection] = useState<string>("All");
  const [loadingRubric, setLoadingRubric] = useState(false);

  useEffect(() => {
    if (samples.length > 0 && !selectedSample) {
      loadSample(samples[0]);
    }
  }, [samples]);

  const loadSample = (sample: SampleApplication) => {
    setSelectedSample(sample);
    setRawText(sample.raw_submission_text);
  };

  const handleOpenRubric = async () => {
    setShowRubricModal(true);
    if (rubricLines.length === 0) {
      setLoadingRubric(true);
      try {
        const data = await fetchRubric();
        setRubricLines(data.lines || []);
      } catch (err) {
        console.error("Failed to load rubric:", err);
      } finally {
        setLoadingRubric(false);
      }
    }
  };

  const filteredRubric = rubricLines.filter((line) => {
    const q = rubricSearch.toLowerCase();
    const matchesSearch =
      line.line_id.toLowerCase().includes(q) ||
      line.text.toLowerCase().includes(q);
    const matchesSection =
      rubricFilterSection === "All" ||
      line.section.toLowerCase().includes(rubricFilterSection.toLowerCase());
    return matchesSearch && matchesSection;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || isRunning) return;
    onEvaluate(rawText, selectedSample?.metadata);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col text-slate-900">
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Applicant Dossier
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a sample profile or edit the submission text before running the panel.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenRubric}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:border-slate-400 text-slate-700 bg-white transition-colors shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Rubric</span>
        </button>
      </div>

      {samples.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-2.5">
            Sample Profiles
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {samples.map((sample) => {
              const active = selectedSample?.applicant_id === sample.applicant_id;
              return (
                <button
                  key={sample.applicant_id}
                  type="button"
                  onClick={() => loadSample(sample)}
                  className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                    active
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50/70"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {sample.full_name}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1 flex items-center justify-between gap-1">
                    <span>{sample.expected_category}</span>
                    {sample.metadata?.target_gpa && (
                      <span>GPA {sample.metadata.target_gpa}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="dossier-input"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
          >
            Submission Text
          </label>
          <span className="font-mono text-[11px] text-slate-400">
            {rawText.length} chars
          </span>
        </div>

        <textarea
          id="dossier-input"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={isRunning}
          rows={11}
          placeholder="Paste or edit applicant essay, GPA, income, and supporting details..."
          className="w-full p-3.5 text-xs font-mono leading-relaxed bg-slate-50/60 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-700 focus:bg-white transition-colors resize-y"
        />

        {selectedSample?.metadata && (
          <dl className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                GPA
              </dt>
              <dd className="font-mono font-semibold text-slate-800 mt-0.5">
                {selectedSample.metadata.target_gpa ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Income
              </dt>
              <dd className="font-mono font-semibold text-slate-800 mt-0.5">
                {selectedSample.metadata.annual_income != null
                  ? `$${selectedSample.metadata.annual_income.toLocaleString()}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Dependents
              </dt>
              <dd className="font-mono font-semibold text-slate-800 mt-0.5">
                {selectedSample.metadata.dependents ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Enrollment
              </dt>
              <dd className="font-semibold text-slate-800 mt-0.5 truncate">
                {selectedSample.metadata.enrollment_status ?? "—"}
              </dd>
            </div>
          </dl>
        )}

        <button
          type="submit"
          disabled={isRunning || !rawText.trim()}
          className="mt-6 w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running Panel Evaluation...</span>
            </>
          ) : (
            <span>Run Panel Evaluation</span>
          )}
        </button>
      </form>

      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[82vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Published Rubric</h3>
                <p className="text-xs text-slate-500">
                  Line-indexed rules and scoring thresholds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRubricModal(false)}
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
                  value={rubricSearch}
                  onChange={(e) => setRubricSearch(e.target.value)}
                  placeholder="Filter by line ID or keyword..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-indigo-700"
                />
              </div>

              <div className="flex items-center gap-1">
                {["All", "Eligibility", "Merit", "Need", "Thresholds"].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setRubricFilterSection(sec)}
                    className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                      rubricFilterSection === sec
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
              {loadingRubric ? (
                <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
                  <span>Loading rubric lines...</span>
                </div>
              ) : filteredRubric.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No matching rubric lines found.
                </div>
              ) : (
                filteredRubric.map((item) => (
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}