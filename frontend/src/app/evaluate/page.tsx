"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApplicationForm } from "../../components/ApplicationForm";
import { WorkflowVisualizer } from "../../components/WorkflowVisualizer";
import { DecisionScorecard } from "../../components/DecisionScorecard";
import {
  SampleApplication,
  EvaluationResponse,
  AgentTraceItem,
  StreamEvent,
  fetchHealth,
  fetchSamples,
  evaluateApplication,
  evaluateApplicationStream,
} from "../../lib/api";
import { ArrowLeft, RotateCcw } from "lucide-react";

function EvaluatorContent() {
  const searchParams = useSearchParams();
  const sampleParam = searchParams.get("sample");

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
    model_deployment?: string;
    rubric_lines_loaded: number;
  } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealthStatus)
      .catch(() => {});

    fetchSamples()
      .then((data) => {
        setSamples(data);
        if (sampleParam) {
          const match = data.find(
            (s) => s.applicant_id.toLowerCase() === sampleParam.toLowerCase()
          );
          if (match) {
            handleEvaluate(match.raw_submission_text, match.metadata);
          }
        }
      })
      .catch(() => {});
  }, [sampleParam]);

  const handleEvaluate = async (
    submissionText: string,
    metadata?: Record<string, any>
  ) => {
    setIsRunning(true);
    setError(null);
    setEvaluation(null);
    setTraces([]);
    setEvents([]);
    setActiveStage("Intake");
    setIsEligible(null);

    try {
      evaluateApplicationStream(
        submissionText,
        (event: StreamEvent) => {
          setEvents((prev) => [...prev, event]);
          setActiveStage(event.stage);

          if (event.payload?.is_eligible !== undefined) {
            setIsEligible(event.payload.is_eligible);
          }

          setTraces((prev) => {
            const idx = prev.findIndex((t) => t.agent_name === event.agent);
            const item: AgentTraceItem = {
              stage: event.stage,
              agent_name: event.agent,
              status: event.status,
              duration_ms: event.payload?.duration_ms || 0,
              timestamp: event.timestamp || new Date().toISOString(),
              detail: event.message,
            };

            if (idx >= 0) {
              const next = [...prev];
              next[idx] = item;
              return next;
            }
            return [...prev, item];
          });
        },
        (finalResponse: EvaluationResponse) => {
          setEvaluation(finalResponse);
          setTraces(finalResponse.traces);
          setIsEligible(finalResponse.eligibility.is_eligible);
          setActiveStage(null);
          setIsRunning(false);
        },
        async () => {
          try {
            const res = await evaluateApplication(submissionText, metadata);
            setEvaluation(res);
            setTraces(res.traces);
            setIsEligible(res.eligibility.is_eligible);
          } catch (restErr: any) {
            setError(restErr.message || "Evaluation request failed.");
          } finally {
            setActiveStage(null);
            setIsRunning(false);
          }
        },
        metadata
      );
    } catch (err: any) {
      setError(err?.message || "Failed to start evaluation.");
      setActiveStage(null);
      setIsRunning(false);
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
    <div className="bg-[#FBFBF9] min-h-[calc(100vh-4rem)] text-slate-900">
      <div className="border-b border-stone-200 bg-[#FBFBF9]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>
            <span className="text-stone-300">/</span>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Committee Review Desk
            </h1>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-stone-500">
            <span>{healthStatus?.rubric_lines_loaded || 44} RUBRIC LINES</span>
            <span className="text-stone-300">·</span>
            <span>{healthStatus?.model_deployment || "gpt-5-mini"}</span>
            {evaluation && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-sans text-xs font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 py-3 px-4 border-l-2 border-rose-600 bg-rose-50/70 text-xs text-rose-900">
            <span className="font-semibold">Evaluation error:</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <aside className="lg:col-span-4 lg:sticky lg:top-20">
            <ApplicationForm
              samples={samples}
              onEvaluate={handleEvaluate}
              isRunning={isRunning}
            />
          </aside>

          <div className="lg:col-span-8 space-y-6">
            <WorkflowVisualizer
              traces={traces}
              events={events}
              isStreaming={isRunning}
              activeStage={activeStage}
              isEligible={isEligible}
            />

            {evaluation ? (
              <DecisionScorecard evaluation={evaluation} />
            ) : (
              <div className="border-t border-b border-stone-200 py-14 px-6 text-left">
                <p className="font-mono text-[11px] uppercase tracking-widest text-stone-400">
                  Dossier Output
                </p>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-stone-900">
                  Ready for committee evaluation
                </h2>
                <p className="mt-1.5 text-sm text-stone-600 max-w-lg leading-relaxed">
                  Select an applicant dossier in the left column and run the review. The decision sheet will display eligibility checks, weighted merit and need subtotals, and rubric line citations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EvaluatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-xs font-mono text-stone-400">
          Loading review desk...
        </div>
      }
    >
      <EvaluatorContent />
    </Suspense>
  );
}