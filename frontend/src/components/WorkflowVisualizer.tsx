"use client";

import React from "react";
import { AgentTraceItem, StreamEvent } from "../lib/api";

interface WorkflowVisualizerProps {
  traces: AgentTraceItem[];
  events: StreamEvent[];
  isStreaming: boolean;
  activeStage: string | null;
  isEligible: boolean | null;
}

const NODES = [
  { key: "IntakeAgent", stage: "Intake", label: "01 · Intake", weight: "Schema" },
  { key: "EligibilityAgent", stage: "Eligibility", label: "02 · Eligibility", weight: "Gate" },
  { key: "MeritAgent", stage: "Merit", label: "03a · Merit", weight: "55%" },
  { key: "NeedAgent", stage: "Need", label: "03b · Need", weight: "45%" },
  { key: "PanelManager", stage: "Panel", label: "04 · Panel", weight: "Final" },
];

export function WorkflowVisualizer({
  traces,
  events,
  isStreaming,
  activeStage,
  isEligible,
}: WorkflowVisualizerProps) {
  const resolveNode = (agentName: string, defaultStage: string) => {
    const match = [...traces]
      .reverse()
      .find(
        (t) =>
          t.agent_name.toLowerCase().includes(agentName.toLowerCase()) ||
          t.stage.toLowerCase().includes(defaultStage.toLowerCase())
      );

    if (match) {
      return {
        status: match.status,
        duration: match.duration_ms,
        detail: match.detail,
      };
    }

    if (
      activeStage &&
      (activeStage.toLowerCase().includes(agentName.toLowerCase()) ||
        activeStage.toLowerCase().includes(defaultStage.toLowerCase()))
    ) {
      return { status: "RUNNING", duration: 0, detail: "Processing..." };
    }

    if (
      isEligible === false &&
      (agentName === "MeritAgent" || agentName === "NeedAgent")
    ) {
      return { status: "SKIPPED", duration: 0, detail: "Skipped after eligibility hold" };
    }

    return { status: "PENDING", duration: 0, detail: "Queued" };
  };

  const statusPill = (status: string, duration?: number) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
            ACTIVE
          </span>
        );
      case "COMPLETED":
        return (
          <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            {duration ? `${Math.round(duration)}ms` : "DONE"}
          </span>
        );
      case "SHORT_CIRCUITED":
        return (
          <span className="font-mono text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            STOPPED
          </span>
        );
      case "SKIPPED":
        return (
          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            SKIPPED
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] text-slate-400">
            WAITING
          </span>
        );
    }
  };

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 text-slate-900">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Pipeline Progress
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gate check followed by parallel merit and need scoring
          </p>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          {isStreaming ? "Streaming..." : traces.length > 0 ? "Complete" : "Idle"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border border-slate-200 rounded-md bg-slate-50/40">
        {NODES.map((node) => {
          const state = resolveNode(node.key, node.stage);
          return (
            <div key={node.key} className="p-3 bg-white flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  {node.weight}
                </span>
                {statusPill(state.status, state.duration)}
              </div>
              <div className="text-xs font-bold text-slate-900">{node.label}</div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                {state.detail}
              </p>
            </div>
          );
        })}
      </div>

      {latestEvent && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between gap-4 text-xs">
          <div className="truncate text-slate-600">
            <span className="font-mono text-[11px] font-semibold text-indigo-700 mr-2">
              [{latestEvent.stage}]
            </span>
            <span>{latestEvent.message}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 shrink-0">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>
      )}
    </div>
  );
}