"use client";

import React, { useState, useEffect } from "react";
import { SampleApplication, RubricLine, fetchRubric } from "../lib/api";
import { 
  FileText, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  X,
  UserCheck,
  Send,
  Loader2
} from "lucide-react";

interface ApplicationFormProps {
  samples: SampleApplication[];
  onEvaluate: (submissionText: string, metadata?: Record<string, any>) => void;
  isRunning: boolean;
}

export function ApplicationForm({ samples, onEvaluate, isRunning }: ApplicationFormProps) {
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
        setRubricLines(data.lines);
      } catch (err) {
        console.error("Failed to load rubric", err);
      } finally {
        setLoadingRubric(false);
      }
    }
  };

  const filteredRubric = rubricLines.filter((line) => {
    const matchesSearch =
      line.line_id.toLowerCase().includes(rubricSearch.toLowerCase()) ||
      line.text.toLowerCase().includes(rubricSearch.toLowerCase());
    const matchesSection =
      rubricFilterSection === "All" || line.section.toLowerCase().includes(rubricFilterSection.toLowerCase());
    return matchesSearch && matchesSection;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || isRunning) return;
    onEvaluate(rawText, selectedSample?.metadata);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Applicant Submission
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Load realistic test cases or paste custom applicant credentials
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenRubric}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900 transition-colors shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          View Rubric
        </button>
      </div>

      {/* Preset Test Cases */}
      <div className="my-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
          Preset Benchmark Applicants
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {samples.map((sample) => {
            const isSelected = selectedSample?.applicant_id === sample.applicant_id;
            let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
            let Icon = AlertTriangle;

            if (sample.expected_category === "AWARD") {
              badgeColor = isSelected
                ? "bg-emerald-950/70 border-emerald-500 text-emerald-300"
                : "bg-slate-800 hover:bg-emerald-950/40 text-slate-300 border-slate-700";
              Icon = CheckCircle2;
            } else if (sample.expected_category === "WAITLIST") {
              badgeColor = isSelected
                ? "bg-amber-950/70 border-amber-500 text-amber-300"
                : "bg-slate-800 hover:bg-amber-950/40 text-slate-300 border-slate-700";
              Icon = AlertTriangle;
            } else {
              badgeColor = isSelected
                ? "bg-rose-950/70 border-rose-500 text-rose-300"
                : "bg-slate-800 hover:bg-rose-950/40 text-slate-300 border-slate-700";
              Icon = XCircle;
            }

            return (
              <button
                key={sample.applicant_id}
                type="button"
                onClick={() => loadSample(sample)}
                className={`flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all ${badgeColor}`}
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="truncate">{sample.full_name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      sample.expected_category === "AWARD"
                        ? "bg-emerald-900/60 text-emerald-300"
                        : sample.expected_category === "WAITLIST"
                        ? "bg-amber-900/60 text-amber-300"
                        : "bg-rose-900/60 text-rose-300"
                    }`}
                  >
                    {sample.expected_category}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {sample.metadata?.target_gpa ? `GPA ${sample.metadata.target_gpa} • ` : ""}
                  {sample.metadata?.annual_income ? `$${sample.metadata.annual_income.toLocaleString()} inc` : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Raw Application Dossier (Text / JSON)
            </label>
            <span className="text-[11px] text-slate-500">
              {rawText.length} characters
            </span>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isRunning}
            rows={10}
            className="w-full flex-1 min-h-[190px] p-3 text-xs bg-slate-950/90 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-mono resize-none"
            placeholder="Paste application text or JSON dossier..."
          />

          {selectedSample?.metadata && (
            <div className="mt-2.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">GPA</span>
                <span className="font-semibold text-slate-200">{selectedSample.metadata.target_gpa}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Enrollment</span>
                <span className="font-semibold text-slate-200 truncate block">{selectedSample.metadata.enrollment_status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Income</span>
                <span className="font-semibold text-slate-200">${selectedSample.metadata.annual_income?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Dependents</span>
                <span className="font-semibold text-slate-200">{selectedSample.metadata.dependents}</span>
              </div>
              <div>
                <span className="text-slate-500 block">First-Gen</span>
                <span className="font-semibold text-slate-200">{selectedSample.metadata.first_gen ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="font-semibold text-slate-200">Verified</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4 mt-2">
          <button
            type="submit"
            disabled={isRunning || !rawText.trim()}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Multi-Agent Workflow In Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Evaluate with Multi-Agent Panel</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Published Rubric Modal Drawer */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Official Published Scholarship Rubric
                  </h3>
                  <p className="text-xs text-slate-400">
                    Line-indexed evaluation criteria & deterministic decision formulas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRubricModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap gap-2 items-center justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search rubric line ID or text (e.g., RUBRIC-L04, GPA, 78.0)..."
                  value={rubricSearch}
                  onChange={(e) => setRubricSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1">
                {["All", "Eligibility", "Merit", "Need", "Thresholds"].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setRubricFilterSection(sec)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      rubricFilterSection === sec
                        ? "bg-indigo-600 text-white font-medium"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Rubric Content Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-sans">
              {loadingRubric ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Loading line-indexed rubric...</span>
                </div>
              ) : filteredRubric.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No rubric criteria matching your filter.
                </div>
              ) : (
                filteredRubric.map((item) => (
                  <div
                    key={item.line_id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors flex items-start gap-3"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                      {item.line_id}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {item.section}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                type="button"
                onClick={() => setShowRubricModal(false)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Close Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
