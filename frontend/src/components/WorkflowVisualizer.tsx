"use client";

import React from "react";
import { AgentTraceItem, StreamEvent } from "../lib/api";
import { 
  GitFork, 
  CheckCircle2, 
  Clock, 
  AlertOctagon, 
  MinusCircle, 
  Cpu, 
  ShieldCheck, 
  Award, 
  Coins, 
  Scale,
  Sparkles,
  ArrowRight,
  CornerDownRight
} from "lucide-react";

interface WorkflowVisualizerProps {
  traces: AgentTraceItem[];
  events: StreamEvent[];
  isStreaming: boolean;
  activeStage: string | null;
  isEligible: boolean | null;
}

export function WorkflowVisualizer({
  traces,
  events,
  isStreaming,
  activeStage,
  isEligible
}: WorkflowVisualizerProps) {
  // Find current state for each primary agent
  const getAgentStatus = (agentName: string, defaultStage: string) => {
    const trace = [...traces].reverse().find(
      (t) => t.agent_name.toLowerCase().includes(agentName.toLowerCase()) || 
             t.stage.toLowerCase().includes(defaultStage.toLowerCase())
    );
    if (trace) {
      return { status: trace.status, duration: trace.duration_ms, detail: trace.detail };
    }

    if (activeStage && (activeStage.toLowerCase().includes(agentName.toLowerCase()) || activeStage.toLowerCase().includes(defaultStage.toLowerCase()))) {
      return { status: "RUNNING", duration: 0, detail: "Agent running..." };
    }

    if (isEligible === false && (agentName === "MeritAgent" || agentName === "NeedAgent")) {
      return { status: "SKIPPED", duration: 0, detail: "Short-circuited at gatekeeper" };
    }

    return { status: "PENDING", duration: 0, detail: "Awaiting execution" };
  };

  const intakeStatus = getAgentStatus("IntakeAgent", "Intake");
  const eligibilityStatus = getAgentStatus("EligibilityAgent", "Eligibility");
  const meritStatus = getAgentStatus("MeritAgent", "Merit");
  const needStatus = getAgentStatus("NeedAgent", "Need");
  const panelStatus = getAgentStatus("PanelManager", "Panel");

  const renderBadge = (status: string, duration?: number) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-900/80 text-indigo-300 border border-indigo-500 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            RUNNING
          </span>
        );
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {duration ? `${Math.round(duration)}ms` : "DONE"}
          </span>
        );
      case "SHORT_CIRCUITED":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-950 text-rose-300 border border-rose-600">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            HALTED
          </span>
        );
      case "SKIPPED":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <MinusCircle className="w-3 h-3 text-slate-500" />
            SKIPPED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-slate-500 border border-slate-800">
            <Clock className="w-3 h-3 text-slate-600" />
            QUEUED
          </span>
        );
    }
  };

  const getNodeBoxStyle = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50";
      case "COMPLETED":
        return "border-emerald-600/80 bg-slate-900 shadow-sm";
      case "SHORT_CIRCUITED":
        return "border-rose-600/80 bg-rose-950/20";
      case "SKIPPED":
        return "border-slate-800/60 bg-slate-950/40 opacity-50";
      default:
        return "border-slate-800 bg-slate-950/70";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            Multi-Agent Pipeline Graph
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Conditional gatekeeping + concurrent fan-out / fan-in multi-agent workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/80 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Live SSE Active
            </span>
          )}
        </div>
      </div>

      {/* Visual Workflow Graph */}
      <div className="space-y-3 font-sans">
        {/* Stage 1: Intake Agent */}
        <div className={`p-3.5 rounded-lg border transition-all ${getNodeBoxStyle(intakeStatus.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Stage 1: IntakeAgent</span>
                  <span className="text-[10px] text-slate-400 font-mono">Pydantic Parser</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Normalizes raw applicant narrative into strict validated schema
                </p>
              </div>
            </div>
            <div>{renderBadge(intakeStatus.status, intakeStatus.duration)}</div>
          </div>
          {intakeStatus.detail && intakeStatus.status === "COMPLETED" && (
            <p className="text-[11px] text-slate-300 font-mono mt-2 pt-2 border-t border-slate-800/80 truncate">
              {intakeStatus.detail}
            </p>
          )}
        </div>

        {/* Arrow Connector */}
        <div className="flex justify-center text-slate-600">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Stage 2: Eligibility Gatekeeper */}
        <div className={`p-3.5 rounded-lg border transition-all ${getNodeBoxStyle(eligibilityStatus.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-amber-950 border border-amber-800 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Stage 2: EligibilityAgent</span>
                  <span className="text-[10px] text-amber-400 font-mono">RAG Gatekeeper</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Evaluates hard Section 1 rules via RAG. Short-circuits if any rule fails.
                </p>
              </div>
            </div>
            <div>{renderBadge(eligibilityStatus.status, eligibilityStatus.duration)}</div>
          </div>
          {eligibilityStatus.detail && (
            <p className="text-[11px] text-slate-300 font-mono mt-2 pt-2 border-t border-slate-800/80 line-clamp-2">
              {eligibilityStatus.detail}
            </p>
          )}
        </div>

        {/* Fan-Out Branching Visual */}
        <div className="relative py-1">
          <div className="flex items-center justify-center gap-8 text-[11px] text-indigo-400 font-semibold">
            <span className="flex items-center gap-1">
              <CornerDownRight className="w-3.5 h-3.5" />
              Parallel Fan-Out (Concurrent Scoring)
            </span>
          </div>
        </div>

        {/* Stage 3: Fan-Out Parallel Specialists (Merit & Need) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Branch A: Merit Agent */}
          <div className={`p-3.5 rounded-lg border transition-all ${getNodeBoxStyle(meritStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-950 border border-blue-800 text-blue-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">MeritAgent</span>
                  <span className="text-[10px] text-blue-300 font-mono">Weight: 55%</span>
                </div>
              </div>
              <div>{renderBadge(meritStatus.status, meritStatus.duration)}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Scores GPA rigor (40), Research/Leadership (35), Statement (25)
            </p>
            {meritStatus.detail && meritStatus.status === "COMPLETED" && (
              <p className="text-[11px] text-blue-300/90 font-mono mt-2 pt-2 border-t border-slate-800/80 line-clamp-2">
                {meritStatus.detail}
              </p>
            )}
          </div>

          {/* Branch B: Need Agent */}
          <div className={`p-3.5 rounded-lg border transition-all ${getNodeBoxStyle(needStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">NeedAgent</span>
                  <span className="text-[10px] text-emerald-300 font-mono">Weight: 45%</span>
                </div>
              </div>
              <div>{renderBadge(needStatus.status, needStatus.duration)}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Scores Income/Dependents (60), Special Hardship Gap (40)
            </p>
            {needStatus.detail && needStatus.status === "COMPLETED" && (
              <p className="text-[11px] text-emerald-300/90 font-mono mt-2 pt-2 border-t border-slate-800/80 line-clamp-2">
                {needStatus.detail}
              </p>
            )}
          </div>
        </div>

        {/* Fan-In Connector */}
        <div className="relative py-1">
          <div className="flex items-center justify-center text-[11px] text-indigo-400 font-semibold">
            <span>Fan-In Aggregation</span>
          </div>
        </div>

        {/* Stage 4: Panel Manager */}
        <div className={`p-3.5 rounded-lg border transition-all ${getNodeBoxStyle(panelStatus.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-purple-950 border border-purple-800 text-purple-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Stage 4: PanelManager</span>
                  <span className="text-[10px] text-purple-300 font-mono">Deterministic Synthesis</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Applies formula (Merit×0.55 + Need×0.45) & determines AWARD/WAITLIST/REJECT
                </p>
              </div>
            </div>
            <div>{renderBadge(panelStatus.status, panelStatus.duration)}</div>
          </div>
          {panelStatus.detail && panelStatus.status === "COMPLETED" && (
            <p className="text-[11px] text-purple-300/90 font-mono mt-2 pt-2 border-t border-slate-800/80 line-clamp-2">
              {panelStatus.detail}
            </p>
          )}
        </div>
      </div>

      {/* Live Stream Event Log Accordion */}
      {events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Live Agent Execution Stream ({events.length} events)
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">SSE Stream</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[10px] font-mono">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-500 shrink-0">
                  {ev.timestamp ? ev.timestamp.split("T")[1]?.slice(0, 8) : "--:--:--"}
                </span>
                <span className="font-semibold text-indigo-300 shrink-0">[{ev.stage}]</span>
                <span className="text-slate-400 truncate">{ev.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
