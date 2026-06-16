"use client";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const AGENTS = [
  { icon: "🧠", label: "Startup Advisor" },
  { icon: "📊", label: "Market Research" },
  { icon: "📋", label: "Product Manager" },
  { icon: "🏗️", label: "Architect" },
  { icon: "⚙️", label: "Engineering Manager" },
  { icon: "📣", label: "Marketing" },
];

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) router.push("/dashboard");
  }, [isSignedIn, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
             style={{ background: "var(--accent-glow)", color: "var(--accent)", border: "1px solid var(--accent)" }}>
          ✦ Multi-Agent AI Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
          Your Startup,{" "}
          <span style={{ color: "var(--accent)" }}>Orchestrated by AI</span>
        </h1>
        <p className="text-xl mb-10" style={{ color: "var(--muted)" }}>
          Input your idea. Six specialized AI agents handle market research, product strategy,
          technical architecture, sprint planning, and GTM — all in under 5 minutes.
        </p>
        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <SignUpButton>
            <button className="btn-primary px-8 py-3 text-base">Get Started Free →</button>
          </SignUpButton>
          <SignInButton>
            <button className="px-8 py-3 text-base rounded-lg font-semibold"
                    style={{ border: "1px solid var(--border)", color: "var(--text)" }}>
              Sign In
            </button>
          </SignInButton>
        </div>

        {/* Agent Pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {AGENTS.map((a, i) => (
            <div key={i} className="card p-4 text-left flex items-center gap-3">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Agent {i + 1}</div>
                <div className="font-semibold text-sm">{a.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-10">
          {["GitHub Repo Created", "Notion PRD Written", "Live Web Search", "PDF Report", "Sprint Plan", "GTM Strategy"].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              ✓ {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
