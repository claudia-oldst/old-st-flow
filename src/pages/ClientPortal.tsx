import { useParams } from "react-router-dom";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useClientPortalData } from "@/features/client-portal/useClientPortalData";
import { formatHours } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react";
import oldStLogo from "@/assets/oldst-logo.png";

function HealthState(burnPct: number, donePct: number): "good" | "warn" | "bad" {
  // Green = burn < progress, Yellow = roughly equal, Red = burn > progress
  const diff = burnPct - donePct;
  if (diff <= -5) return "good";
  if (diff >= 8) return "bad";
  return "warn";
}

function Pill({ state }: { state: "good" | "warn" | "bad" }) {
  if (state === "good")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-good/15 text-health-good ring-1 ring-health-good/30 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" /> On track
      </span>
    );
  if (state === "warn")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-warn/15 text-health-warn ring-1 ring-health-warn/30 text-xs font-medium">
        <TrendingUp className="h-3.5 w-3.5" /> Watch closely
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-health-bad/15 text-health-bad ring-1 ring-health-bad/30 text-xs font-medium">
      <AlertTriangle className="h-3.5 w-3.5" /> Over budget
    </span>
  );
}

function Ring({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth="10" fill="none" />
          <circle
            cx="70" cy="70" r={r}
            stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            className="transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-mono text-xl font-semibold ticker">{Math.round(pct)}%</div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-dimmer">{label}</div>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { hash } = useParams<{ hash: string }>();
  const { data, loading, error } = useClientPortalData(hash);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-dim">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <ShieldCheck className="h-10 w-10 text-dimmer" />
        <h1 className="font-display text-xl">Portal unavailable</h1>
        <p className="text-sm text-dim max-w-sm">
          {error ?? "This link is invalid or has been disabled by the project team."}
        </p>
      </div>
    );
  }

  const { project, totals, epics, changes } = data;

  const burnPct = totals.current_total > 0
    ? (totals.actual_total / totals.current_total) * 100
    : 0;
  const donePct = totals.tickets_total > 0
    ? (totals.tickets_done / totals.tickets_total) * 100
    : 0;
  const health = HealthState(burnPct, donePct);

  const feActual = totals.fe_actual;
  const beActual = totals.be_actual;
  const splitTotal = feActual + beActual;
  const fePct = splitTotal > 0 ? (feActual / splitTotal) * 100 : 50;

  const cutoffLabel = format(new Date(project.cutoff), "MMM d, yyyy 'at' HH:mm");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Slim branded header */}
      <header className="hairline-b backdrop-blur-xl bg-background/80 sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <img src={oldStLogo} alt="Old St Labs" className="h-7 w-auto" />
          <div className="text-[10px] uppercase tracking-wider text-dimmer">
            Client portal
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        {/* Title band */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-2 py-1 rounded-md bg-white/5 hairline text-dim">
              {project.acronym}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
            {project.client_name && (
              <span className="text-sm text-dim">· {project.client_name}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Pill state={health} />
            <div className="text-xs text-dimmer">
              Data verified and finalized up to <span className="text-dim font-mono">{cutoffLabel}</span>
            </div>
          </div>
        </section>

        {/* Gauges */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-3">Budget burn</div>
            <Ring
              pct={burnPct}
              label={`${formatHours(totals.actual_total)} of ${formatHours(totals.current_total)}`}
              color={
                health === "good" ? "hsl(var(--health-good))" :
                health === "warn" ? "hsl(var(--health-warn))" :
                "hsl(var(--health-bad))"
              }
            />
            <div className="mt-3 text-xs text-dim">
              {formatHours(totals.actual_total)} logged · {formatHours(totals.current_total)} budgeted
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-3">Completion</div>
            <Ring
              pct={donePct}
              label={`${totals.tickets_done} / ${totals.tickets_total} tickets`}
              color="hsl(var(--primary))"
            />
            <div className="mt-3 text-xs text-dim">
              {totals.tickets_done} of {totals.tickets_total} items delivered
            </div>
          </div>
        </section>

        {/* Discipline split */}
        {splitTotal > 0 && (
          <section className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wider text-dimmer">Work split</div>
              <div className="text-[10px] text-dimmer font-mono">
                FE {formatHours(feActual)} · BE {formatHours(beActual)}
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full overflow-hidden bg-white/5 flex">
              <div
                className="bg-primary transition-all"
                style={{ width: `${fePct}%` }}
                title={`Frontend ${Math.round(fePct)}%`}
              />
              <div
                className="bg-accent transition-all"
                style={{ width: `${100 - fePct}%` }}
                title={`Backend ${Math.round(100 - fePct)}%`}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-dimmer">
              <span>Frontend {Math.round(fePct)}%</span>
              <span>Backend {Math.round(100 - fePct)}%</span>
            </div>
          </section>
        )}

        {/* Executive Summary */}
        {project.summary && (
          <section className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Executive summary</div>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.summary}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Epics */}
        {epics.length > 0 && (
          <section className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-3">Feature progress</div>
            <div className="space-y-3">
              {epics.map((e) => {
                const pct = e.total_tickets > 0
                  ? (e.done_tickets / e.total_tickets) * 100
                  : 0;
                return (
                  <div key={e.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm font-medium truncate">
                        {e.epic_name ?? "Untitled epic"}
                      </div>
                      <div className="text-[11px] font-mono text-dim">
                        {e.done_tickets}/{e.total_tickets} · {formatHours(e.current_estimate)}
                        {e.original_estimate > 0 && e.original_estimate !== e.current_estimate && (
                          <span className="text-dimmer"> (was {formatHours(e.original_estimate)})</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Change log */}
        {changes.length > 0 && (
          <section className="glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-wider text-dimmer mb-3">Scope evolution</div>
            <ol className="relative border-l border-white/10 ml-2 space-y-4">
              {changes.map((c) => (
                <li key={c.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-accent ring-2 ring-background" />
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-mono text-xs text-dim">{c.ticket_formatted_id}</span>
                    <span className="text-[10px] uppercase tracking-wider text-dimmer">{c.discipline}</span>
                    <span className="font-mono text-xs">
                      {formatHours(c.previous_hours)} → {formatHours(c.new_hours)}
                    </span>
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
                        c.delta > 0
                          ? "bg-health-bad/15 text-health-bad"
                          : "bg-health-good/15 text-health-good"
                      }`}
                    >
                      {c.delta > 0 ? "+" : ""}{formatHours(c.delta)}
                    </span>
                  </div>
                  {c.reason && (
                    <div className="text-xs text-dim mt-1">{c.reason}</div>
                  )}
                  <div className="text-[10px] text-dimmer mt-1 font-mono">
                    {format(new Date(c.occurred_at), "MMM d, yyyy")}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="pt-6 pb-4 text-center text-[10px] text-dimmer">
          Snapshot generated by Old St Labs · {cutoffLabel}
        </footer>
      </main>
    </div>
  );
}
