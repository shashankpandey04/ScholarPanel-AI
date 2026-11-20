"use client";

import React, { useState, useEffect } from "react";
import { ApplicationForm } from "../components/ApplicationForm";
import { WorkflowVisualizer } from "../components/WorkflowVisualizer";
import { DecisionScorecard } from "../components/DecisionScorecard";
import { 
  SampleApplication, 
  EvaluationResponse, 
  AgentTraceItem, 
  StreamEvent, 
  fetchHealth, 
  fetchSamples, 
  evaluateApplication, 
  evaluateApplicationStream 
} from "../lib/api";
import { 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Layers,
  Cpu,
  BookOpenCheck
} from "lucide-react";

export default function EvaluatorDashboard() {
  const [samples, setSamples] = useState<SampleApplication[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [traces, setTraces] = useState<AgentTraceItem[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    azure_configured: boolean;
    rubric_lines_loaded: number;
  } | null>(null);

  useEffect(() => {
    // Initial health and samples fetch
    fetchHealth()
      .then(setHealthStatus)
      .catch((err) => console.warn("Backend not yet ready:", err));

    fetchSamples()
      .then(setSamples)
      .catch((err) => console.warn("Failed to load samples:", err));
  }, []);

  const handleEvaluate = async (submissionText: string, metadata?: Record<string, any>) => {
    setIsRunning(true);
    setError(null);
    setEvaluation(null);
    setTraces([]);
    setEvents([]);
    setActiveStage("Intake");
    setIsEligible(null);

    // Try live SSE stream first
    try {
      evaluateApplicationStream(
        submissionText,
        (event: StreamEvent) => {
          setEvents((prev) => [...prev, event]);
          setActiveStage(event.stage);

          if (event.payload?.is_eligible !== undefined) {
            setIsEligible(event.payload.is_eligible);
          }

          // Build or update trace items from stream events
          setTraces((prev) => {
            const existingIndex = prev.findIndex((t) => t.agent_name === event.agent);
            const traceItem: AgentTraceItem = {
              stage: event.stage,
              agent_name: event.agent,
              status: event.status,
              duration_ms: event.payload?.duration_ms || 0,
              timestamp: event.timestamp || new Date().toISOString(),
              detail: event.message,
            };

            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = traceItem;
              return updated;
            } else {
              return [...prev, traceItem];
            }
          });
        },
        (finalResponse: EvaluationResponse) => {
          setEvaluation(finalResponse);
          setTraces(finalResponse.traces);
          setIsEligible(finalResponse.eligibility.is_eligible);
          setActiveStage(null);
          setIsRunning(false);
        },
        async (streamErr) => {
          console.warn("SSE stream failed, falling back to REST evaluate endpoint:", streamErr);
          // Fallback to REST endpoint
          try {
            const res = await evaluateApplication(submissionText, metadata);
            setEvaluation(res);
            setTraces(res.traces);
            setIsEligible(res.eligibility.is_eligible);
          } catch (restErr: any) {
            setError(restErr.message || "Evaluation request failed");
          } finally {
            setActiveStage(null);
            setIsRunning(false);
          }
        },
        metadata
      );
    } catch (err: any) {
      // Direct REST fallback
      try {
        const res = await evaluateApplication(submissionText, metadata);
        setEvaluation(res);
        setTraces(res.traces);
        setIsEligible(res.eligibility.is_eligible);
      } catch (restErr: any) {
        setError(restErr.message || "Failed to complete multi-agent evaluation");
      } finally {
        setActiveStage(null);
        setIsRunning(false);
      }
    }
  };

  const handleReset = () => {
    setEvaluation(null);
    setTraces([]);
    setEvents([]);
    setActiveStage(null);
    setIsEligible(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  ScholarPanel AI
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Microsoft Agent Framework
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounded Multi-Agent Grant & Scholarship Application Evaluator
              </p>
            </div>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-slate-400 text-[11px]">Rubric:</span>
              <span className="font-mono font-semibold text-slate-200 text-[11px]">
                {healthStatus?.rubric_lines_loaded || 44} lines indexed
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px]">Engine:</span>
              <span className="font-mono font-semibold text-slate-200 text-[11px]">
                Azure OpenAI
              </span>
            </div>

            {evaluation && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                title="Reset evaluation view"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col">
        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-200 flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-sm">Evaluation Error</span>
              <p className="mt-0.5 text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Left Column: Application Form & Rubric (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <ApplicationForm
              samples={samples}
              onEvaluate={handleEvaluate}
              isRunning={isRunning}
            />

            {/* Workflow Architecture Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase tracking-wider text-[11px]">
                <Layers className="w-4 h-4" />
                Multi-Agent Workflow Topology
              </div>
              <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                <li><strong className="text-slate-200">Stage 1 (Intake):</strong> Pydantic parsing into normalized schema.</li>
                <li><strong className="text-slate-200">Stage 2 (Gatekeeper):</strong> RAG eligibility verification against Section 1. Short-circuits on fail.</li>
                <li><strong className="text-slate-200">Stage 3 (Fan-Out):</strong> Concurrent evaluation by MeritAgent (55%) & NeedAgent (45%).</li>
                <li><strong className="text-slate-200">Stage 4 (Fan-In):</strong> PanelManager deterministically aggregates weighted score.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Workflow Visualizer & Scorecard (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            {/* Live Pipeline Visualizer */}
            <WorkflowVisualizer
              traces={traces}
              events={events}
              isStreaming={isRunning}
              activeStage={activeStage}
              isEligible={isEligible}
            />

            {/* Decision Scorecard */}
            {evaluation ? (
              <DecisionScorecard evaluation={evaluation} />
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 rounded-full bg-slate-950 border border-slate-800 text-slate-500">
                  <BookOpenCheck className="w-8 h-8 text-indigo-400/60" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Awaiting Evaluation Run
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a preset applicant on the left or customize applicant details, then click <strong className="text-indigo-400">Evaluate with Multi-Agent Panel</strong> to watch the live fan-out/fan-in process.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[11px] text-slate-600">
        ScholarPanel AI • Built with FastAPI, Next.js App Router, Microsoft Agent Framework & Azure OpenAI
      </footer>
    </main>
  );
}
