"use client";
import { useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { listSessions } from "@/lib/api";
import Link from "next/link";

interface Session {
  id: string;
  startup_idea: string;
  status: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  complete: { color: "var(--success)", label: "Complete" },
  running:  { color: "var(--accent)",  label: "Running" },
  error:    { color: "#ff4444",         label: "Error" },
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    getToken().then(token => listSessions(token ?? undefined))
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="font-black text-lg" style={{ color: "var(--accent)" }}>FounderAI</Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm">+ New Run</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black mb-6">Past Runs</h1>

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 h-20 animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🚀</div>
            <p className="font-semibold mb-2">No runs yet</p>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Run your first startup idea to see results here</p>
            <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-sm">Start Now →</Link>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {sessions.map(s => {
            const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.running;
            return (
              <Link href={`/session/${s.id}`} key={s.id}
                    className="card p-4 flex items-center gap-4 hover:border-indigo-500 transition-colors"
                    style={{ textDecoration: "none" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.startup_idea}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background: `${style.color}20`, color: style.color }}>
                  {style.label}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
