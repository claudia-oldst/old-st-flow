import type { Status } from "@/lib/types";
import { DISC_OPTIONS } from "./ChipGroup";
import { evaluateRule } from "./evaluateRule";
import type { Rule } from "./RuleRow";

interface Props {
  rules: Rule[];
  statuses: Status[];
}

export function StatusRulesPreviewMatrix({ rules, statuses }: Props) {
  const statusById = (id: string) => statuses.find((s) => s.id === id);
  const matrix = DISC_OPTIONS.map((feOpt) =>
    DISC_OPTIONS.map((beOpt) => {
      const winning = rules.find((r) => evaluateRule(r, feOpt.value, beOpt.value));
      return {
        fe: feOpt.value,
        be: beOpt.value,
        status: winning ? statusById(winning.status_id) ?? null : null,
      };
    }),
  );

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-3">Preview matrix</div>
      <div className="glass rounded-2xl p-4 overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="p-2 text-dimmer text-left font-normal">FE ↓ / BE →</th>
              {DISC_OPTIONS.map((be) => (
                <th key={be.value} className="p-2 text-left text-dim font-medium">{be.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={DISC_OPTIONS[i].value}>
                <td className="p-2 text-dim font-medium">{DISC_OPTIONS[i].label}</td>
                {row.map((cell, j) => (
                  <td key={j} className="p-2">
                    {cell.status ? (
                      <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] ring-1 ring-white/5">
                        <span className="h-2 w-2 rounded-full" style={{ background: cell.status.color }} />
                        {cell.status.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/10 text-destructive ring-1 ring-destructive/30">
                        No rule
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[11px] text-dimmer mt-3">
          Cells marked "No rule" mean tickets with that FE/BE combo will keep their existing project status.
        </div>
      </div>
    </div>
  );
}
