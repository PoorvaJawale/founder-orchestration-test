"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { getPdfUrl, getMemory, getSession } from "@/lib/api";

const AGENT_META: Record<string, { label: string; icon: string; desc: string }> = {
  startup_advisor:      { label: "Startup Advisor",      icon: "🧠", desc: "Validates idea, identifies risks" },
  market_research:      { label: "Market Research",      icon: "📊", desc: "Web search, SWOT, competitors" },
  product_manager:      { label: "Product Manager",      icon: "📋", desc: "PRD, user stories → Notion" },
  architect:            { label: "Architect",            icon: "🏗️", desc: "Tech stack, GitHub repo created" },
  engineering_manager:  { label: "Engineering Manager",  icon: "⚙️", desc: "Sprint plan, GitHub issues" },
  marketing:            { label: "Marketing",            icon: "📣", desc: "GTM strategy, landing copy" },
};

const AGENT_ORDER = ["startup_advisor", "market_research", "product_manager",
                     "architect", "engineering_manager", "marketing"];

type AgentStatus = "pending" | "running" | "done" | "error";

interface AgentState {
  status: AgentStatus;
  data: any;
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [agents, setAgents] = useState<Record<string, AgentState>>(() =>
    Object.fromEntries(AGENT_ORDER.map(k => [k, { status: "pending", data: null }]))
  );
  const [currentAgent, setCurrentAgent] = useState<string | null>(AGENT_ORDER[0]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"prd" | "tech" | "marketing" | "sprints">("prd");
  
  const [memory, setMemory] = useState<any>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const completedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let es: EventSource;

    const init = async () => {
      const token = await getToken();

      // Check if session is already complete — load from DB instead of re-running
      try {
        const session = await getSession(id as string, token ?? undefined);
        if (session.status === "complete") {
          const outputs: Record<string, any> = session.outputs || {};
          const newAgents: Record<string, AgentState> = Object.fromEntries(
            AGENT_ORDER.map(k => [k, {
              status: outputs[k] ? "done" : "pending",
              data: outputs[k] || null,
            }])
          );
          setAgents(newAgents);
          setDone(true);
          setCurrentAgent(null);
          return;
        }
        if (session.status === "error") {
          const outputs: Record<string, any> = session.outputs || {};
          setAgents(Object.fromEntries(
            AGENT_ORDER.map(k => [k, { status: outputs[k] ? "done" : "pending", data: outputs[k] || null }])
          ));
          setError("This orchestration run encountered an error.");
          setCurrentAgent(null);
          return;
        }
      } catch {
        // session fetch failed, fall through to stream
      }

      // Session is still running — connect to stream
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const url = new URL(`${API}/api/sessions/${id}/stream`);
      if (token) url.searchParams.set("token", token);

      es = new EventSource(url.toString());
      eventSourceRef.current = es;

      setCurrentAgent(AGENT_ORDER[0]);
      setAgents(prev => ({ ...prev, [AGENT_ORDER[0]]: { ...prev[AGENT_ORDER[0]], status: "running" } }));

      es.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "log") {
          setLogs(prev => [...prev, msg.message]);
        }

        if (msg.type === "agent_complete") {
          const { agent, data } = msg;
          completedRef.current.add(agent);
          const hasError = data && data.error;
          setAgents(prev => ({
            ...prev,
            [agent]: { status: hasError ? "error" : "done", data }
          }));
          if (!hasError) {
            const idx = AGENT_ORDER.indexOf(agent);
            if (idx < AGENT_ORDER.length - 1) {
              const next = AGENT_ORDER[idx + 1];
              setCurrentAgent(next);
              setAgents(prev => ({ ...prev, [next]: { ...prev[next], status: "running" } }));
            }
          }
        }

        if (msg.type === "complete") {
          setDone(true);
          setCurrentAgent(null);
          es.close();
        }

        if (msg.type === "error") {
          setError(msg.message);
          if (currentAgent) {
            setAgents(prev => ({
              ...prev,
              [currentAgent]: { ...prev[currentAgent], status: "error" }
            }));
          }
          setCurrentAgent(null);
          es.close();
        }
      };

      es.onerror = () => {
        if (!done) setError("Connection lost. Please refresh.");
        es.close();
      };
    };

    init();
    return () => { es?.close(); };
  }, [id]);

  useEffect(() => {
    if (done) {
      const fetchMemory = async () => {
        setLoadingMemory(true);
        try {
          const token = await getToken();
          const memData = await getMemory(id as string, token ?? undefined);
          setMemory(memData);
        } catch (err) {
          console.error("Failed to load memory:", err);
        } finally {
          setLoadingMemory(false);
        }
      };
      fetchMemory();
    }
  }, [done, id]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="font-black text-lg" style={{ color: "var(--accent)" }}>FounderAI</Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {done && (
            <a href={getPdfUrl(id)} target="_blank" rel="noreferrer"
               className="btn-primary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm hidden sm:inline-flex">
              ⬇ Download PDF Report
            </a>
          )}
          <Link href="/history" className="text-sm px-2 py-1 rounded hover:bg-zinc-800" style={{ color: "var(--muted)" }}>History</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black mb-1">
              {error ? "❌ Orchestration Stopped" : done ? "✅ Orchestration Complete" : "⚡ Running Orchestration…"}
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {error 
                ? "The pipeline stopped execution due to a critical agent failure." 
                : done 
                  ? "All 6 agents have completed. Your founder package is ready." 
                  : "Agents are working in sequence. Results appear as each completes."}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm"
               style={{ background: "#ff444420", border: "1px solid #ff4444", color: "#ff6666" }}>
            <b>Error:</b> {error}
          </div>
        )}

        {/* Live Terminal Console */}
        <div className="mb-6 p-4 rounded-xl border font-mono text-xs leading-relaxed" style={{ background: "#0a0a0f", borderColor: "var(--border)", color: "#39ff14" }}>
          <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: "var(--border)" }}>
            <span className="font-bold flex items-center gap-1.5" style={{ color: "var(--text)", fontFamily: "Inter, sans-serif" }}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <span>Orchestration Execution Logs</span>
            </span>
            {!done && !error && <span className="animate-pulse font-sans text-[10px] text-zinc-400">● processing...</span>}
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
            {logs.length === 0 ? (
              <p className="text-zinc-600 italic">Initializing micro-agent status stream...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="whitespace-pre-wrap">{log}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Pipeline */}
        <div className="flex flex-col gap-4">
          {AGENT_ORDER.map((key, idx) => {
            const meta = AGENT_META[key];
            const state = agents[key];
            return (
              <div key={key}>
                <AgentCard agentKey={key} meta={meta} state={state} />
                {idx < AGENT_ORDER.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-px h-4" style={{ background: "var(--border)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tabbed Interactive Viewers */}
        {done && (
          <div className="mt-8 card p-6">
            <h2 className="font-black text-lg mb-4 flex items-center gap-2">
              <span>🖥️</span> Interactive Founder Deliverables
            </h2>
            
            {/* Tabs Headers */}
            <div className="flex border-b mb-6 overflow-x-auto gap-2" style={{ borderColor: "var(--border)" }}>
              {[
                { id: "prd", label: "Product PRD" },
                { id: "tech", label: "Tech Specs" },
                { id: "marketing", label: "Marketing Copy" },
                { id: "sprints", label: "Project Board" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors -mb-px"
                  style={{
                    borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                    color: activeTab === tab.id ? "var(--text)" : "var(--muted)"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Notion PRD */}
            {activeTab === "prd" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-zinc-400">Product Requirements Document</span>
                </div>
                {agents.product_manager.data?.prd_markdown ? (
                  renderMarkdown(agents.product_manager.data.prd_markdown)
                ) : (
                  <p className="text-xs italic text-zinc-500">No PRD markdown available.</p>
                )}
              </div>
            )}

            {/* Tab 2: Tech Specs */}
            {activeTab === "tech" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-400">Database Schema (SQL Models)</h3>
                  <div className="space-y-3">
                    {agents.architect.data?.data_models?.map((model: any, mIdx: number) => (
                      <div key={mIdx} className="p-3 rounded-lg border font-mono text-xs" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                        <span className="font-bold text-indigo-400 block mb-1">class {model.name} :</span>
                        <div className="pl-4 space-y-0.5">
                          {model.fields?.map((field: string, fIdx: number) => (
                            <div key={fIdx} className="text-zinc-300">• {field}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-400">API Endpoint Directory</h3>
                  <div className="space-y-2">
                    {agents.architect.data?.api_endpoints?.map((ep: any, epIdx: number) => (
                      <div key={epIdx} className="p-3 rounded-lg border flex items-center justify-between gap-4 text-xs font-mono" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                        <span className="font-semibold text-zinc-300 truncate">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 inline-block`}
                                style={{
                                  background: ep.method === "GET" ? "#22c55e20" : ep.method === "POST" ? "#6366f120" : "#f59e0b20",
                                  color: ep.method === "GET" ? "var(--success)" : ep.method === "POST" ? "var(--accent)" : "var(--warning)"
                                }}>
                            {ep.method}
                          </span>
                          {ep.path}
                        </span>
                        <span className="text-[11px] text-zinc-400 text-right">{ep.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 3: Marketing Copy */}
            {activeTab === "marketing" && (
              <div className="space-y-4">
                {agents.marketing.data?.tagline && (
                  <div className="p-3 rounded-lg text-center font-bold text-sm mb-4"
                       style={{ background: "var(--accent-glow)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
                    "{agents.marketing.data.tagline}"
                  </div>
                )}
                
                {agents.marketing.data?.landing_page_copy && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Landing Page Mockup Copy</h3>
                    <div className="p-4 rounded-lg border space-y-3" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">Hero Headline</span>
                        <p className="font-bold text-sm mt-0.5">{agents.marketing.data.landing_page_copy.hero_headline}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">Hero Subheadline</span>
                        <p className="text-xs text-zinc-300 mt-0.5">{agents.marketing.data.landing_page_copy.hero_subheadline}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">CTA Button Text</span>
                        <p className="text-xs text-zinc-300 mt-0.5">{agents.marketing.data.landing_page_copy.cta_text}</p>
                      </div>
                      {agents.marketing.data.landing_page_copy.social_proof && (
                        <div>
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase">Social Proof</span>
                          <p className="text-xs italic text-zinc-400 mt-0.5">"{agents.marketing.data.landing_page_copy.social_proof}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {agents.marketing.data?.gtm_strategy && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-400">Go-To-Market Narrative</h3>
                    <p className="text-xs leading-relaxed text-zinc-300 p-3 rounded-lg border whitespace-pre-line" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                      {agents.marketing.data.gtm_strategy}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* Tab 4: Project Board */}
            {activeTab === "sprints" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-400">Sprint Delivery Cycles</h3>
                  <div className="space-y-3">
                    {agents.engineering_manager.data?.sprints?.map((sprint: any, sIdx: number) => (
                      <div key={sIdx} className="p-3 rounded-lg border" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>Sprint {sprint.sprint}: {sprint.goal}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{sprint.duration_weeks} weeks</span>
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {sprint.tasks?.map((task: any, tIdx: number) => (
                            <div key={tIdx} className="text-xs flex items-start justify-between gap-4 py-1 border-b border-dashed" style={{ borderColor: "var(--border)" }}>
                              <div className="min-w-0">
                                <span className="font-semibold text-zinc-300">{task.title}</span>
                                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{task.description}</p>
                              </div>
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "var(--border)", color: "var(--muted)" }}>
                                {task.label} ({task.story_points} pts)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {agents.engineering_manager.data?.definition_of_done && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-zinc-400">Definition of Done (DoD)</h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-300">
                      {agents.engineering_manager.data.definition_of_done.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Structured Memory Block */}
        {done && memory && (
          <div className="mt-8 card p-6 border-2" style={{ borderColor: "var(--success)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💾</span>
              <h2 className="font-black text-lg">Structured Founder Memory Store</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              The unified startup memory footprint stored in your permanent knowledge base.
            </p>
            <div className="space-y-4">
              <div>
                <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Startup Name</span>
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--accent)" }}>{memory.startupName}</p>
              </div>

              <div>
                <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Base Idea</span>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text)" }}>{memory.idea}</p>
              </div>

              <div>
                <span className="font-semibold text-xs uppercase tracking-wider mb-1 block" style={{ color: "var(--muted)" }}>Compiled Roadmaps</span>
                {memory.roadmaps && memory.roadmaps.length > 0 ? (
                  <div className="space-y-1.5 mt-1">
                    {memory.roadmaps.map((r: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded border text-xs" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                        <span className="font-bold block" style={{ color: "var(--accent)" }}>{r.phase} ({r.duration})</span>
                        <span className="text-muted block mt-0.5" style={{ color: "var(--muted)" }}>
                          {r.deliverables?.join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: "var(--muted)" }}>No roadmaps stored.</p>
                )}
              </div>

              {memory.documents && memory.documents.length > 0 && (
                <div>
                  <span className="font-semibold text-xs uppercase tracking-wider mb-1 block" style={{ color: "var(--muted)" }}>Linked Documents</span>
                  <div className="space-y-1.5 mt-1">
                    {memory.documents.map((doc: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded border text-xs" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                        <span style={{ color: "var(--text)" }}>
                          {doc.type === "link" ? "🔗" : "📄"} {doc.name}
                        </span>
                        {doc.url && (
                          <a href={doc.url.startsWith("/") ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${doc.url}` : doc.url}
                             target="_blank" rel="noreferrer"
                             className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                             style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
                            Open →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(done || error) && (
          <div className="mt-8 card p-6 text-center">
            <div className="text-3xl mb-2">{error ? "⚠️" : "🎉"}</div>
            <h2 className="font-black text-xl mb-2">
              {error ? "Orchestration Failed" : "Your Founder Package is Ready"}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              {error 
                ? "The pipeline was interrupted by a connection or API error." 
                : "GitHub repo created, Notion PRD published, PDF report ready to download."}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {!error && (
                <a href={getPdfUrl(id)} target="_blank" rel="noreferrer"
                   className="btn-primary px-6 py-2.5 text-sm">
                  ⬇ Download PDF Report
                </a>
              )}
              <Link href="/dashboard"
                    className="px-6 py-2.5 text-sm rounded-lg font-semibold"
                    style={{ border: "1px solid var(--border)", color: "var(--text)" }}>
                Run Another Idea
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AgentCard({ agentKey, meta, state }: { agentKey: string; meta: any; state: AgentState }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = {
    pending: "var(--muted)",
    running: "var(--accent)",
    done: "var(--success)",
    error: "#ff4444",
  }[state.status];

  const statusLabel = {
    pending: "Waiting",
    running: "Working…",
    done: "Complete",
    error: "Error",
  }[state.status];

  return (
    <div className="card overflow-hidden" style={{ borderColor: state.status === "running" ? "var(--accent)" : state.status === "error" ? "#ff4444" : "var(--border)" }}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => state.status === "done" && setExpanded(e => !e)}
      >
        <div className="text-2xl w-10 text-center">{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{meta.label}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>{meta.desc}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {state.status === "running" && (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                     style={{ background: "var(--accent)", animation: `bounce 1s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
          <span className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: `${statusColor}20`, color: statusColor }}>
            {statusLabel}
          </span>
          {state.status === "done" && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {expanded && state.data && (
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <AgentOutput agentKey={agentKey} data={state.data} />
        </div>
      )}
    </div>
  );
}

function AgentOutput({ agentKey, data }: { agentKey: string; data: any }) {
  if (!data || data.error) return (
    <p className="text-sm" style={{ color: "#ff6666" }}>{data?.error || "No output"}</p>
  );

  if (agentKey === "startup_advisor") return (
    <div className="space-y-3 text-xs">
      <Field label="Generated Startup Name" value={data.startup_name} />
      <Field label="Refined Idea" value={data.refined_idea} />
      <Field label="Problem" value={data.problem_statement} />
      <Field label="Target Audience" value={data.target_audience} />
      <Field label="Value Proposition" value={data.value_proposition} />
      <div>
        <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Risks</span>
        <ul className="mt-1 space-y-1">{data.risks?.map((r: string, i: number) => (
          <li key={i} className="text-xs" style={{ color: "var(--muted)" }}>• {r}</li>
        ))}</ul>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>Recommendation:</span>
        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase"
              style={{ background: data.recommendation === "proceed" ? "#22c55e20" : "#f59e0b20",
                       color: data.recommendation === "proceed" ? "#22c55e" : "#f59e0b" }}>
          {data.recommendation}
        </span>
      </div>
    </div>
  );

  if (agentKey === "market_research") return (
    <div className="space-y-3 text-xs">
      <Field label="Market Size" value={data.market_size} />
      <Field label="Growth Rate" value={data.market_growth_rate} />
      <Field label="Positioning" value={data.recommended_positioning} />
      <ListField label="Competitors" items={data.competitors?.map((c: any) => `${c.name} — ${c.description}`)} />
      <ListField label="Market Gaps" items={data.gaps} />
      <ListField label="Trends" items={data.trends} />
    </div>
  );

  if (agentKey === "product_manager") return (
    <div className="space-y-3 text-xs">
      {data.notion_url && (
        <a href={data.notion_url} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
           style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--accent)" }}>
          📄 View PRD in Notion →
        </a>
      )}
      <ListField label="MVP Scope" items={data.mvp_scope} />
      <ListField label="Success Metrics" items={data.success_metrics} />
      {data.roadmap && data.roadmap.length > 0 && (
        <div className="mt-3">
          <span className="font-semibold text-xs uppercase tracking-wider mb-2 block" style={{ color: "var(--muted)" }}>Product Roadmap</span>
          <div className="space-y-2">
            {data.roadmap.map((item: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>{item.phase}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{item.duration}</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {item.deliverables?.map((del: string, dIdx: number) => (
                    <li key={dIdx} className="text-xs" style={{ color: "var(--text)" }}>{del}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (agentKey === "architect") return (
    <div className="space-y-3 text-xs">
      <Field label="System Design" value={data.system_design} />
      {data.tech_stack && (
        <div>
          <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tech Stack</span>
          <div className="mt-1 space-y-1">
            {Object.entries(data.tech_stack).map(([k, v]: any) => (
              <div key={k} className="text-xs"><span className="font-medium capitalize">{k}:</span> {String(v)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (agentKey === "engineering_manager") return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="text-center p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
          <div className="text-2xl font-black" style={{ color: "var(--accent)" }}>{data.total_weeks}w</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Total Duration</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
          <div className="text-2xl font-black" style={{ color: "var(--accent)" }}>{data.sprints?.length}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Sprints</div>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
          <div className="text-2xl font-black" style={{ color: "var(--accent)" }}>{data.github_issues_created ?? "—"}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>GitHub Issues</div>
        </div>
      </div>
      {data.sprints?.map((s: any) => <SprintCard key={s.sprint} sprint={s} />)}

      {data.github_issues && data.github_issues.length > 0 && (
        <div className="mt-2">
          <span className="font-semibold text-xs uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>GitHub Issues</span>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.github_issues.map((issue: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs p-1.5 rounded" style={{ background: "var(--surface2)" }}>
                <span className="truncate" style={{ color: "var(--text)" }}>{issue.title}</span>
                {issue.url ? (
                  <a href={issue.url} target="_blank" rel="noreferrer"
                     className="flex-shrink-0 font-semibold" style={{ color: "var(--accent)" }}>
                    #{issue.number}
                  </a>
                ) : (
                  <span className="flex-shrink-0 text-red-400">error</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.github_repo_url && (
        <a href={data.github_repo_url} target="_blank" rel="noreferrer"
           className="btn-primary w-full py-2 text-xs text-center flex items-center justify-center gap-1.5 mt-2">
          🐙 View GitHub Repository
        </a>
      )}
    </div>
  );

  if (agentKey === "marketing") return (
    <div className="space-y-3 text-xs">
      {data.tagline && (
        <div className="p-3 rounded-lg text-center font-bold text-xs"
             style={{ background: "var(--accent-glow)", border: "1px solid var(--accent)", color: "var(--accent)" }}>
          "{data.tagline}"
        </div>
      )}
      {data.landing_page_copy && (
        <div>
          <Field label="Hero Headline" value={data.landing_page_copy.hero_headline} />
          <Field label="Subheadline" value={data.landing_page_copy.hero_subheadline} />
          <Field label="CTA" value={data.landing_page_copy.cta_text} />
        </div>
      )}
      <Field label="GTM Strategy" value={data.gtm_strategy} />
      <ListField label="Launch Channels" items={data.launch_channels?.map((c: any) => `${c.channel}: ${c.tactic}`)} />
      {data.pricing_recommendation && (
        <Field label="Pricing Model" value={data.pricing_recommendation.model} />
      )}
      {data.email_sequence && data.email_sequence.length > 0 && (
        <EmailSequenceEditor emails={data.email_sequence} />
      )}
      {data["90_day_plan"] && data["90_day_plan"].length > 0 && (
        <div>
          <span className="font-semibold text-xs uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>90-Day Execution Plan</span>
          <div className="space-y-1">
            {data["90_day_plan"].map((step: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs p-2 rounded" style={{ background: "var(--surface2)" }}>
                <span className="font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                <span style={{ color: "var(--text)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.linkedin_post && <LinkedInPostField postText={data.linkedin_post} />}
    </div>
  );

  return <pre className="text-xs overflow-auto" style={{ color: "var(--muted)" }}>{JSON.stringify(data, null, 2)}</pre>;
}

function SprintCard({ sprint }: { sprint: any }) {
  const [showAll, setShowAll] = useState(false);
  const tasks = sprint.tasks || [];
  const visible = showAll ? tasks : tasks.slice(0, 4);
  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
      <div className="font-semibold text-xs mb-1">Sprint {sprint.sprint}: {sprint.goal}</div>
      <ul className="space-y-0.5">
        {visible.map((t: any, i: number) => (
          <li key={i} className="text-xs" style={{ color: "var(--muted)" }}>• {t.title}</li>
        ))}
      </ul>
      {tasks.length > 4 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-xs mt-1.5 font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {showAll ? "Show less" : `+${tasks.length - 4} more`}
        </button>
      )}
    </div>
  );
}

function EmailSequenceEditor({ emails }: { emails: any[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editedBodies, setEditedBodies] = useState<Record<number, string>>(() =>
    Object.fromEntries(emails.map((e, i) => [i, e.body || e.body_preview || ""]))
  );

  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(editedBodies[idx] || "");
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const active = emails[activeIdx];

  return (
    <div>
      <span className="font-semibold text-xs uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
        Email Campaign Sequence
      </span>
      {/* Email tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {emails.map((email: any, i: number) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="text-[10px] font-bold px-2.5 py-1 rounded border transition-colors"
            style={{
              borderColor: activeIdx === i ? "var(--accent)" : "var(--border)",
              background: activeIdx === i ? "var(--accent-glow)" : "var(--surface2)",
              color: activeIdx === i ? "var(--accent)" : "var(--muted)",
            }}
          >
            Email {email.email} · {email.send_time}
          </button>
        ))}
      </div>

      {/* Active email editor */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
              {active.subject}
            </div>
            {active.goal && (
              <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>Goal: {active.goal}</div>
            )}
          </div>
          <button
            onClick={() => handleCopy(activeIdx)}
            className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded border font-semibold transition-colors"
            style={{ borderColor: "var(--border)", color: copiedIdx === activeIdx ? "var(--success)" : "var(--muted)", background: "transparent" }}
          >
            {copiedIdx === activeIdx ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>
        {/* Editable body */}
        <textarea
          value={editedBodies[activeIdx]}
          onChange={e => setEditedBodies(prev => ({ ...prev, [activeIdx]: e.target.value }))}
          rows={10}
          className="w-full p-3 text-xs leading-relaxed resize-none outline-none"
          style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}

function LinkedInPostField({ postText }: { postText: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>LinkedIn Launch Post</span>
        <button
          onClick={handleCopy}
          className="text-[10px] px-2.5 py-1 rounded border font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
        >
          {copied ? "✓ Copied!" : "📋 Copy Post"}
        </button>
      </div>
      <pre className="p-3 rounded-lg border text-xs whitespace-pre-wrap font-sans leading-relaxed text-left"
           style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}>
        {postText}
      </pre>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</span>
      <p className="mt-0.5 text-xs leading-relaxed">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</span>
      <ul className="mt-1 space-y-0.5">
        {items.map((item, i) => <li key={i} className="text-xs" style={{ color: "var(--muted)" }}>• {item}</li>)}
      </ul>
    </div>
  );
}

function renderMarkdown(md: string) {
  if (!md) return null;
  const lines = md.split("\n");
  return (
    <div className="space-y-3 text-sm leading-relaxed max-h-[400px] overflow-y-auto p-4 rounded-lg border text-left" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("# ")) {
          return <h1 key={idx} className="text-base font-black border-b pb-1 mt-4 mb-2" style={{ color: "var(--accent)", borderColor: "var(--border)" }}>{trimmed.substring(2)}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={idx} className="text-sm font-bold mt-3 mb-1.5" style={{ color: "var(--accent)" }}>{trimmed.substring(3)}</h2>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} className="text-xs font-bold mt-2 mb-1" style={{ color: "var(--muted)" }}>{trimmed.substring(4)}</h3>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <li key={idx} className="ml-4 list-disc text-xs text-zinc-300">{trimmed.substring(2)}</li>;
        }
        if (trimmed) {
          const formatted = trimmed.replace(/\*\*(.*?)\*\//g, "$1");
          return <p key={idx} className="mb-1 text-xs text-zinc-300">{formatted}</p>;
        }
        return <div key={idx} className="h-1.5" />;
      })}
    </div>
  );
}
