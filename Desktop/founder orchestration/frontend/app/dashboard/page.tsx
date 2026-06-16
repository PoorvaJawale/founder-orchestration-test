"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { createSession, verifyIntegrations } from "@/lib/api";
import Link from "next/link";

const EXAMPLE_IDEAS = [
  "An AI-powered personal finance app that analyzes spending patterns and gives real-time coaching",
  "A marketplace connecting freelance developers with early-stage startups for equity-based work",
  "A B2B SaaS tool that auto-generates ISO compliance documentation from codebase analysis",
];

export default function Dashboard() {
  const [idea, setIdea] = useState("");
  const [businessPlan, setBusinessPlan] = useState<File | null>(null);
  const [competitorReport, setCompetitorReport] = useState<File | null>(null);
  const [prdFile, setPrdFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [integrations, setIntegrations] = useState<{
    github: { valid: boolean; username?: string; error?: string };
    notion: { valid: boolean; error?: string };
  } | null>(null);
  const [checkingIntegrations, setCheckingIntegrations] = useState(true);
  
  const bpRef = useRef<HTMLInputElement>(null);
  const crRef = useRef<HTMLInputElement>(null);
  const prdRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const { getToken } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = await getToken();
        const status = await verifyIntegrations(token ?? undefined);
        setIntegrations(status);
      } catch (err) {
        console.error("Failed to verify integrations:", err);
      } finally {
        setCheckingIntegrations(false);
      }
    };
    checkStatus();
  }, [getToken]);

  const handleSubmit = async () => {
    if (!idea.trim() || loading || checkingIntegrations || isBlocked) return;
    setError("");
    setLoading(true);
    try {
      const token = await getToken();
      const files = {
        businessPlan: businessPlan || undefined,
        competitorReport: competitorReport || undefined,
        prdFile: prdFile || undefined,
      };
      const { session_id } = await createSession(idea, files, token ?? undefined);
      router.push(`/session/${session_id}`);
    } catch (e: any) {
      setError(e.message || "Failed to start session");
      setLoading(false);
    }
  };

  const isBlocked = !integrations || !integrations.github.valid || !integrations.notion.valid;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="font-black text-lg" style={{ color: "var(--accent)" }}>FounderAI</span>
        <div className="flex items-center gap-4">
          <Link href="/history" className="text-sm" style={{ color: "var(--muted)" }}>Past Runs</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {/* Integrations Diagnostic Panel */}
        <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>⚙️ System Integrations Diagnostics</span>
            {checkingIntegrations && <span className="text-[10px] lowercase animate-pulse" style={{ color: "var(--muted)" }}>checking status...</span>}
          </h3>
          
          {checkingIntegrations && (
            <div className="space-y-2 mt-2 h-10 animate-pulse bg-zinc-800 rounded" />
          )}

          {!checkingIntegrations && integrations && (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">GitHub Integration</span>
                <span className="px-2 py-0.5 rounded font-bold text-[10px]" 
                      style={{ 
                        background: integrations.github.valid ? "#22c55e20" : "#ff444420", 
                        color: integrations.github.valid ? "var(--success)" : "#ff4444" 
                      }}>
                  {integrations.github.valid ? `Connected (${integrations.github.username})` : "Disconnected"}
                </span>
              </div>
              {!integrations.github.valid && (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[10px]" style={{ color: "#ff6666" }}>GitHub not connected to your account.</p>
                  <a
                    href="https://clerk.com/docs/authentication/social-connections/github"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] underline font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    Connect via Account Settings →
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="font-semibold">Notion Database Integration</span>
                <span className="px-2 py-0.5 rounded font-bold text-[10px]" 
                      style={{ 
                        background: integrations.notion.valid ? "#22c55e20" : "#ff444420", 
                        color: integrations.notion.valid ? "var(--success)" : "#ff4444" 
                      }}>
                  {integrations.notion.valid ? "Connected" : "Disconnected"}
                </span>
              </div>
              {!integrations.notion.valid && (
                <p className="text-[10px] mt-0.5" style={{ color: "#ff6666" }}>Error: {integrations.notion.error}</p>
              )}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-black mb-2">What's your startup idea?</h1>
        <p className="mb-8 text-sm" style={{ color: "var(--muted)" }}>
          Describe it in 1-3 sentences. Six AI agents will build your complete founder package.
        </p>

        {/* Input */}
        <div className="card p-1 mb-4">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="e.g. An AI tool that reads job descriptions and auto-tailors resumes for each application..."
            rows={5}
            className="w-full p-4 text-base resize-none outline-none"
            style={{ background: "transparent", color: "var(--text)" }}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-xs" style={{ color: "var(--muted)" }}>{idea.length} chars · ⌘+Enter to run</span>
          </div>
        </div>

        {/* Supporting Docs */}
        <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Optional Supporting Documents (PDFs)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>Business Plan</label>
              <button
                type="button"
                onClick={() => bpRef.current?.click()}
                className="w-full text-xs text-left px-3 py-2.5 rounded-md border flex items-center justify-between transition-colors hover:border-gray-500"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                <span className="truncate flex-1">{businessPlan ? businessPlan.name : "Select PDF"}</span>
                {businessPlan && (
                  <span className="text-red-500 font-bold ml-1 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setBusinessPlan(null); }}>✕</span>
                )}
              </button>
              <input ref={bpRef} type="file" accept=".pdf" className="hidden" onChange={e => setBusinessPlan(e.target.files?.[0] ?? null)} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>Competitor Report</label>
              <button
                type="button"
                onClick={() => crRef.current?.click()}
                className="w-full text-xs text-left px-3 py-2.5 rounded-md border flex items-center justify-between transition-colors hover:border-gray-500"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                <span className="truncate flex-1">{competitorReport ? competitorReport.name : "Select PDF"}</span>
                {competitorReport && (
                  <span className="text-red-500 font-bold ml-1 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setCompetitorReport(null); }}>✕</span>
                )}
              </button>
              <input ref={crRef} type="file" accept=".pdf" className="hidden" onChange={e => setCompetitorReport(e.target.files?.[0] ?? null)} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted)" }}>PRD Document</label>
              <button
                type="button"
                onClick={() => prdRef.current?.click()}
                className="w-full text-xs text-left px-3 py-2.5 rounded-md border flex items-center justify-between transition-colors hover:border-gray-500"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                <span className="truncate flex-1">{prdFile ? prdFile.name : "Select PDF"}</span>
                {prdFile && (
                  <span className="text-red-500 font-bold ml-1 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setPrdFile(null); }}>✕</span>
                )}
              </button>
              <input ref={prdRef} type="file" accept=".pdf" className="hidden" onChange={e => setPrdFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm"
               style={{ background: "#ff444420", border: "1px solid #ff4444", color: "#ff6666" }}>
            {error}
          </div>
        )}

        {isBlocked && !checkingIntegrations && (
          <div className="mb-4 px-4 py-3 rounded-lg text-xs"
               style={{ background: "#f59e0b20", border: "1px solid var(--warning)", color: "var(--warning)", lineHeight: "1.4" }}>
            ⚠️ <b>Integrations Required:</b> Please connect your GitHub account via Account Settings (click your avatar → Manage Account → Connected Accounts → GitHub) and ensure Notion is configured. Both must be active to run orchestration.
          </div>
        )}

        <button 
          className="btn-primary w-full py-3.5 text-base mb-8" 
          onClick={handleSubmit} 
          disabled={!idea.trim() || loading || checkingIntegrations || isBlocked}
        >
          {loading ? "Starting orchestration…" : isBlocked && !checkingIntegrations ? "Integrations Setup Required ⚠️" : "Run Orchestration →"}
        </button>

        {/* Examples */}
        <div>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Try an example</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_IDEAS.map((ex, i) => (
              <button key={i} onClick={() => setIdea(ex)}
                      className="text-left px-4 py-3 rounded-lg text-sm transition-colors"
                      style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface)" }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
