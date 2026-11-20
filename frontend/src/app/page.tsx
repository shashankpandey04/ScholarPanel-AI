"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Coins, 
  Scale, 
  Cpu, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Download, 
  Layers, 
  GitFork,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Search,
  X
} from "lucide-react";
import { fetchHealth, fetchRubric, RubricLine } from "../lib/api";

export default function LandingPage() {
  const [health, setHealth] = useState<{ status: string; model_deployment?: string; rubric_lines_loaded: number } | null>(null);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricLines, setRubricLines] = useState<RubricLine[]>([]);
  const [rubricSearch, setRubricSearch] = useState("");
  const [rubricFilter, setRubricFilter] = useState("All");

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => {});
  }, []);

  const openRubric = async () => {
    setShowRubricModal(true);
    if (rubricLines.length === 0) {
      try {
        const data = await fetchRubric();
        setRubricLines(data.lines);
      } catch (e) {
        console.error("Failed to load rubric", e);
      }
    }
  };

  const filteredRubric = rubricLines.filter((l) => {
    const matchesSearch = l.line_id.toLowerCase().includes(rubricSearch.toLowerCase()) || l.text.toLowerCase().includes(rubricSearch.toLowerCase());
    const matchesSec = rubricFilter === "All" || l.section.toLowerCase().includes(rubricFilter.toLowerCase());
    return matchesSearch && matchesSec;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                ScholarPanel AI
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  v1.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 -mt-0.5">
                Autonomous Grant & Scholarship Evaluator
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
            <a href="#architecture" className="hover:text-indigo-400 transition-colors">Architecture</a>
            <a href="#benchmarks" className="hover:text-indigo-400 transition-colors">Test Cases</a>
            <a href="#rubric-system" className="hover:text-indigo-400 transition-colors">Scoring Rubric</a>
            <a href="#governance" className="hover:text-indigo-400 transition-colors">Audit & Governance</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={openRubric}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rubric Lines</span>
            </button>

            <Link
              href="/evaluate"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-950/60 transition-all cursor-pointer"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-slate-800/80 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Conditional + Fan-Out / Fan-In Multi-Agent Architecture</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-mono text-[11px]">{health?.model_deployment || "gpt-5-mini"}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Defensible, Rubric-Grounded Scholarship Decisions in <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Seconds</span>, Not Weeks.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate evaluation bias and committee backlogs. A 4-stage multi-agent pipeline audits hard eligibility rules, fans out concurrently to academic merit and financial need specialists, and deterministically aggregates weighted committee scores.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/evaluate"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-indigo-950/60 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Evaluator Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={openRubric}
              className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>View Published Rubric [44 Lines]</span>
            </button>
          </div>

          {/* Key Metrics / Highlights */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Scoring Integrity</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">100% Deterministic</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Zero math hallucinations</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Committee Formula</span>
              <span className="text-xl font-bold font-mono text-indigo-300 mt-1 block">55% M + 45% N</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Official [RUBRIC-L40]</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Gatekeeper Screen</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">Short-Circuit</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Instant reject on hard rule</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Line Citations</span>
              <span className="text-xl font-bold font-mono text-purple-300 mt-1 block">[RUBRIC-Lxx]</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Verbatim quotes on every pt</span>
            </div>
          </div>
        </div>
      </section>

      {/* Preset Benchmarks Showcase Section */}
      <section id="benchmarks" className="py-16 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400">
              Pre-Built Test Cases
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Benchmark Candidate Scenarios
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Explore how the multi-agent pipeline handles distinct real-world applicant profiles with deterministic verdicts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Case 1: Aarav Sharma */}
            <div className="p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                    AWARD VERDICT
                  </span>
                  <span className="text-xs font-mono text-slate-400">APP-2026-001</span>
                </div>
                <h3 className="text-base font-bold text-white">Aarav Sharma</h3>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  High Academic Rigor & High Financial Need
                </p>
                <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1 text-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GPA:</span>
                    <span>3.92 / 4.00 (Band A)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Income:</span>
                    <span>$28,000 (5 dependents)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Merit Subtotal:</span>
                    <span className="text-blue-300 font-bold">94 pts (55%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Need Subtotal:</span>
                    <span className="text-emerald-300 font-bold">92 pts (45%)</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-emerald-400">
                    <span>Weighted Total:</span>
                    <span>93.10 / 100</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Published paper in IEEE edge AI, founded rural code literacy initiative, first-generation college student facing acute medical tuition deficit.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <Link
                  href="/evaluate?sample=APP-2026-001"
                  className="w-full py-2 px-3 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Evaluate Aarav Sharma</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Case 2: Priya Nair */}
            <div className="p-5 rounded-xl border border-amber-800/60 bg-amber-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold font-mono bg-amber-900/60 text-amber-300 border border-amber-700">
                    WAITLIST VERDICT
                  </span>
                  <span className="text-xs font-mono text-slate-400">APP-2026-002</span>
                </div>
                <h3 className="text-base font-bold text-white">Priya Nair</h3>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  Moderate Merit & Manageable Need Profile
                </p>
                <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1 text-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GPA:</span>
                    <span>3.48 / 4.00 (Band B)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Income:</span>
                    <span>$62,000 (2 dependents)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Merit Subtotal:</span>
                    <span className="text-blue-300 font-bold">73 pts (55%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Need Subtotal:</span>
                    <span className="text-emerald-300 font-bold">59 pts (45%)</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-amber-400">
                    <span>Weighted Total:</span>
                    <span>66.70 / 100</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Junior in Biomedical Sciences, undergraduate laboratory researcher, clear career roadmap in diagnostics, moderate unmet tuition shortfall ($7,200).
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <Link
                  href="/evaluate?sample=APP-2026-002"
                  className="w-full py-2 px-3 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-700/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Evaluate Priya Nair</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Case 3: Rohan Verma */}
            <div className="p-5 rounded-xl border border-rose-800/60 bg-rose-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold font-mono bg-rose-900/60 text-rose-300 border border-rose-700">
                    HARD GATE REJECT
                  </span>
                  <span className="text-xs font-mono text-slate-400">APP-2026-003</span>
                </div>
                <h3 className="text-base font-bold text-white">Rohan Verma</h3>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  GPA Below Minimum Academic Benchmark
                </p>
                <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1 text-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">GPA:</span>
                    <span className="text-rose-400 font-bold">2.78 / 4.00 (Fail)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rule Failed:</span>
                    <span className="text-rose-300">[RUBRIC-L04]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Short-Circuit:</span>
                    <span className="text-rose-400">Immediate Halt</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Merit & Need:</span>
                    <span className="text-slate-500">Skipped (0 pts)</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-rose-400">
                    <span>Outcome:</span>
                    <span>Disqualified Outright</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Active in robotics workshops with genuine financial need, but cumulative GPA 2.78 fails mandatory minimum threshold of 3.00, triggering instant gatekeeper rejection.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <Link
                  href="/evaluate?sample=APP-2026-003"
                  className="w-full py-2 px-3 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Evaluate Rohan Verma</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Agent Architecture Topology Section */}
      <section id="architecture" className="py-16 border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400">
              System Topology
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              4-Stage Conditional + Fan-Out / Fan-In Workflow
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Every stage executes in an isolated agent context with dedicated system instructions and typed function tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Stage 1: Intake */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-400 flex items-center justify-center font-bold text-xs mb-3">
                  01
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  IntakeAgent
                </h3>
                <span className="text-[10px] font-mono text-indigo-300 block mt-0.5">Normalization Stage</span>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Parses noisy, unstructured applicant dossiers and resumes into a validated Pydantic schema (<code className="text-slate-300">StructuredApplication</code>).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                Extracts GPA, Income, Dependents, Statement
              </div>
            </div>

            {/* Stage 2: Gatekeeper */}
            <div className="p-4 rounded-xl bg-slate-900 border border-amber-800/60 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-700 text-amber-400 flex items-center justify-center font-bold text-xs mb-3">
                  02
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  EligibilityAgent
                </h3>
                <span className="text-[10px] font-mono text-amber-300 block mt-0.5">Gatekeeper Stage</span>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Audits the 5 non-negotiable Section 1 Hard Rules via RAG. If any hard rule fails, it <strong>short-circuits</strong> immediately to REJECT.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-amber-400/90 font-mono">
                Checks [RUBRIC-L04] through [RUBRIC-L08]
              </div>
            </div>

            {/* Stage 3: Parallel Fan-Out */}
            <div className="p-4 rounded-xl bg-slate-900 border border-blue-800/60 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-700 text-blue-400 flex items-center justify-center font-bold text-xs mb-3">
                  03
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-blue-400" />
                  Parallel Scoring
                </h3>
                <span className="text-[10px] font-mono text-blue-300 block mt-0.5">Fan-Out Concurrency</span>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  <strong>MeritAgent (55%)</strong> and <strong>NeedAgent (45%)</strong> evaluate concurrently, attaching exact line citations and quotes to every single score.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-blue-300/90 font-mono">
                Merit: 100 pts • Need: 100 pts
              </div>
            </div>

            {/* Stage 4: Fan-In */}
            <div className="p-4 rounded-xl bg-slate-900 border border-purple-800/60 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-700 text-purple-400 flex items-center justify-center font-bold text-xs mb-3">
                  04
                </div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-purple-400" />
                  PanelManager
                </h3>
                <span className="text-[10px] font-mono text-purple-300 block mt-0.5">Fan-In Aggregation</span>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Deterministically computes <code className="text-slate-300">(M×0.55)+(N×0.45)</code>, enforces committee thresholds, and drafts defensible executive synthesis.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-purple-300/90 font-mono">
                AWARD (&gt;=78) • WAITLIST • REJECT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Published Rubric Grounding Section */}
      <section id="rubric-system" className="py-16 border-b border-slate-800/80 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-indigo-400">
                Grounded Compliance
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Zero-Hallucination Scoring with Explicit Line Indexing
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                Standard LLM evaluators produce vague, ungrounded justifications. ScholarPanel AI indexes every published institutional rubric rule with an immutable line identifier (<code className="text-indigo-300 font-mono">[RUBRIC-Lxx]</code>).
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Every awarded point links to a specific band and verbatim quote.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated committee audit logs exportable in defensible JSON.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transparent appeal and regulatory compliance readiness.</span>
                </li>
              </ul>
              <div className="mt-6">
                <button
                  onClick={openRubric}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Open Full Rubric Explorer (44 Lines)</span>
                </button>
              </div>
            </div>

            {/* Rubric Sample Preview Box */}
            <div className="w-full lg:max-w-md p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-2 shadow-2xl">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold pb-2 border-b border-slate-800 flex justify-between">
                <span>Rubric Excerpt</span>
                <span className="text-indigo-400">Line Registry</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-indigo-400 font-bold block">[RUBRIC-L04]</span>
                <span className="text-slate-300 text-[11px] block mt-0.5">
                  Criterion 1.1: Cumulative GPA &gt;= 3.00 on 4.00 scale. Below 3.00 disqualified outright.
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-indigo-400 font-bold block">[RUBRIC-L11]</span>
                <span className="text-slate-300 text-[11px] block mt-0.5">
                  Criterion 2.1 Band A (35-40 pts): Cumulative GPA 3.85–4.00 with rigorous honors coursework.
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-indigo-400 font-bold block">[RUBRIC-L28]</span>
                <span className="text-slate-300 text-[11px] block mt-0.5">
                  Criterion 3.1 Band A (50-60 pts): Annual household income &lt;= $30,000 USD with 3+ dependents.
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-indigo-400 font-bold block">[RUBRIC-L40]</span>
                <span className="text-indigo-300 font-bold text-[11px] block mt-0.5">
                  Formula: Weighted Total = (Merit Subtotal * 0.55) + (Need Subtotal * 0.45).
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governance & Compliance Footer CTA */}
      <section id="governance" className="py-16 bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to Evaluate with Institutional Precision?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Test custom applications, inspect live Server-Sent Events (SSE) telemetry, and download committee-ready audit trails.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/evaluate"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/60 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Enter Evaluator Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 bg-slate-950">
        ScholarPanel AI • Built with FastAPI, Next.js App Router, Tailwind CSS & Azure AI Services
      </footer>

      {/* Published Rubric Drawer Modal */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Official Published Scholarship Rubric</h3>
                  <p className="text-xs text-slate-400">All 44 line-indexed rules and deterministic threshold formulas</p>
                </div>
              </div>
              <button onClick={() => setShowRubricModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap gap-2 items-center justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search line ID or requirement (e.g. RUBRIC-L04, GPA, 78.0)..."
                  value={rubricSearch}
                  onChange={(e) => setRubricSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1">
                {["All", "Eligibility", "Merit", "Need", "Thresholds"].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setRubricFilter(sec)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      rubricFilter === sec ? "bg-indigo-600 text-white font-medium" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredRubric.map((item) => (
                <div key={item.line_id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                    {item.line_id}
                  </span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      {item.section}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setShowRubricModal(false)}
                className="px-4 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
