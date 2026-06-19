# Project Health tab

**Tab:** `/projects/:id/health`.

A KPI dashboard for the project. Two big sections: **Overview** and **Estimate Evolution**.

## Overview
- **Profitability pill** — large rounded badge: project margin %, colour-coded (green/amber/coral).
- **Burn ring** — circular gauge: hours logged vs. current estimated total. Centre shows %.
- **Weekly burn panel** — bar chart of hours logged per week, with a dashed line for planned-burn-rate.
- **Epic risk table** — one row per epic showing: estimate vs. actuals, % done, profitability indicator, and a small sparkline of estimate changes over time. Rows are sorted by risk (over-budget first).

## Estimate Evolution
- **Date range control** at the top — preset ranges + custom picker. The "as of" date applies retroactively to every chart.
- **Epic select** to focus a single epic, or "All".
- **Trend chart** — line chart of estimate vs. actuals over time, with markers for each estimate change and CR approval.
- **Snapshot table** — per-epic snapshot at the chosen "as of" date.

## Interactions
- Hovering chart points shows a tooltip with the change reason and proposer.
- Clicking a row in the epic risk table scrolls the Trend chart into focus on that epic.
- Data refreshes in real time when tickets, estimates, time logs, or discounts change.
