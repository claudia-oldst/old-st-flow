import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { format } from "date-fns";
import { formatHours } from "@/lib/utils";
import { formatGBP, type PortalPayload } from "../types";
import logoUrl from "@/assets/oldst-logo.png";

/** old.st brand palette (hex, no leading #). */
const NAVY = "1C2338";
const CORAL = "F76C5E";
const GOLD = "FFCD71";
const INK = "222833";
const MUTED = "6B7280";

/** A4 content width with 1" margins, in DXA. */
const CONTENT_WIDTH = 11906 - 2880;

export interface ReportCR {
  formatted_id: string;
  title: string;
  hours: number;
  status: "pending" | "approved";
  decided_at: string | null;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "DDE1E8" };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

function text(value: string, opts: { bold?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({
    text: value,
    bold: opts.bold,
    color: opts.color ?? INK,
    size: opts.size ?? 20,
  });
}

function cell(
  value: string,
  width: number,
  opts: { bold?: boolean; header?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string } = {},
) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.header
      ? { fill: "F2F4F8", type: ShadingType.CLEAR, color: "auto" }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [
          text(value, {
            bold: opts.bold || opts.header,
            color: opts.header ? NAVY : opts.color,
          }),
        ],
      }),
    ],
  });
}

function table(widths: number[], rows: string[][], opts: { headerRow?: boolean; rightFrom?: number } = {}) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (cols, rowIndex) =>
        new TableRow({
          children: cols.map((value, i) =>
            cell(value, widths[i], {
              header: opts.headerRow !== false && rowIndex === 0,
              align:
                opts.rightFrom !== undefined && i >= opts.rightFrom
                  ? AlignmentType.RIGHT
                  : AlignmentType.LEFT,
            }),
          ),
        }),
    ),
  });
}

function heading(value: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: CORAL, space: 4 },
    },
    children: [new TextRun({ text: value, bold: true, size: 26, color: NAVY })],
  });
}

function body(value: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [text(value)],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

async function loadLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Builds the branded client report .docx from the same payload the PMBA
 * preview renders, so the document matches the snapshot exactly.
 */
export async function buildClientReport({
  payload,
  crs,
  publicUrl,
}: {
  payload: PortalPayload;
  crs: ReportCR[];
  publicUrl: string | null;
}): Promise<Blob> {
  const { project, totals, epics, month } = payload;
  const discounts = payload.discounts ?? [];
  const rate = project.rate_per_hour || 0;
  const showRate = rate > 0;
  const epicName = new Map(epics.map((e) => [e.id, e.epic_name ?? "Untitled epic"]));

  const discountHours = discounts.reduce((s, d) => s + Number(d.hours), 0);
  const effectiveActual = Math.max(0, totals.actual_total - discountHours);
  const devDone = totals.tickets_dev_done ?? 0;
  const completionPct =
    totals.tickets_total > 0
      ? Math.round(((totals.tickets_done + devDone) / totals.tickets_total) * 100)
      : 0;

  const children: (Paragraph | Table)[] = [];

  const logo = await loadLogo();
  if (logo) {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new ImageRun({
            type: "png",
            data: logo,
            transformation: { width: 120, height: 40 },
            altText: { title: "old.st", description: "old.st logo", name: "logo" },
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [new TextRun({ text: project.name, bold: true, size: 40, color: NAVY })],
    }),
  );
  if (project.client_name) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [text(project.client_name, { color: MUTED, size: 22 })],
      }),
    );
  }
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        text(`Status report as of ${format(new Date(project.cutoff), "d MMMM yyyy")}`, {
          color: MUTED,
        }),
      ],
    }),
  );
  const versions = project.versions ?? [];
  if (versions.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [text(`Versions in scope: ${versions.join(", ")}`, { color: MUTED })],
      }),
    );
  }
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
      children: [],
    }),
  );

  if (project.summary) {
    children.push(heading("Introduction"));
    for (const line of project.summary.split(/\n{2,}/)) {
      if (line.trim()) children.push(body(line.trim()));
    }
  }

  // At a glance
  children.push(heading("At a glance"));
  const glanceRows: string[][] = [["Measure", "Value", "Detail"]];
  glanceRows.push([
    "Tickets",
    String(totals.tickets_total),
    [
      `${totals.tickets_done} done`,
      devDone > 0 ? `${devDone} dev done` : null,
      totals.tickets_in_progress > 0 ? `${totals.tickets_in_progress} active` : null,
      totals.tickets_backlog > 0 ? `${totals.tickets_backlog} backlog` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  ]);
  glanceRows.push(["Progress", `${completionPct}%`, "Done and dev done tickets"]);
  if (showRate) {
    glanceRows.push([
      "Cost to date",
      formatGBP(effectiveActual * rate),
      `of ${formatGBP(totals.cost_estimate)} estimated`,
    ]);
  }
  if (month) {
    glanceRows.push([
      `${format(new Date(month.start), "MMMM yyyy")} to date`,
      showRate ? formatGBP(month.cost) : formatHours(month.billed_hours),
      [
        `FE ${formatHours(month.fe_actual)}`,
        `BE ${formatHours(month.be_actual)}`,
        `Project ${formatHours(month.proj_actual)}`,
        month.discount_hours > 0 ? `discounted −${formatHours(month.discount_hours)}` : null,
        `billed ${formatHours(month.billed_hours)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  children.push(table([2600, 2600, 3826], glanceRows));

  // Delivery progress
  children.push(heading("Delivery progress"));
  children.push(
    table(
      [3026, 2000, 2000, 2000],
      [
        ["Discipline", "Done", "In progress", "To do"],
        ["Frontend", String(totals.fe_done), String(totals.fe_in_progress), String(totals.fe_todo)],
        ["Backend", String(totals.be_done), String(totals.be_in_progress), String(totals.be_todo)],
      ],
      { rightFrom: 1 },
    ),
  );

  // Scope by epic
  const included = epics.filter((e) => e.included !== false);
  if (included.length > 0) {
    children.push(heading("Scope by epic"));
    for (const epic of included) {
      const widths = showRate
        ? [3226, 1000, 1400, 1400, 1400, 1600]
        : [4026, 1400, 1800, 1800, 2000];
      const header = showRate
        ? ["Epic", "Tickets", "Actual", "Current", "Original", "Sub-total"]
        : ["Epic", "Tickets", "Actual", "Current", "Original"];
      const row = showRate
        ? [
            epic.epic_name ?? "Untitled epic",
            String(epic.total_tickets),
            formatHours(epic.actual_hours),
            formatHours(epic.current_estimate),
            formatHours(epic.original_estimate),
            formatGBP(epic.current_estimate * rate),
          ]
        : [
            epic.epic_name ?? "Untitled epic",
            String(epic.total_tickets),
            formatHours(epic.actual_hours),
            formatHours(epic.current_estimate),
            formatHours(epic.original_estimate),
          ];
      children.push(table(widths, [header, row], { rightFrom: 1 }));
      if (epic.pmba_text?.trim()) {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 200 },
            indent: { left: 200 },
            children: [text(epic.pmba_text.trim(), { color: MUTED })],
          }),
        );
      } else {
        children.push(spacer());
      }
    }
  }

  // Discounts
  if (discounts.length > 0) {
    children.push(heading("Discounts applied"));
    children.push(
      table(
        [2600, 1400, 1200, 2826, 1000],
        [
          ["Epic", "Discipline", "Hours", "Reason", "Applied"],
          ...discounts.map((d) => [
            epicName.get(d.epic_id) ?? "—",
            d.discipline,
            `−${formatHours(Number(d.hours))}`,
            d.reason || "—",
            format(new Date(d.applied_at), "d MMM yyyy"),
          ]),
        ],
      ),
    );
  }

  // Change requests
  if (crs.length > 0) {
    children.push(heading("Change requests"));
    children.push(
      table(
        [1400, 4026, 1200, 1400, 1000],
        [
          ["Reference", "Title", "Hours", "Status", "Decided"],
          ...crs.map((cr) => [
            cr.formatted_id,
            cr.title,
            `+${formatHours(cr.hours)}`,
            cr.status === "approved" ? "Approved" : "Pending",
            cr.decided_at ? format(new Date(cr.decided_at), "d MMM yyyy") : "—",
          ]),
        ],
      ),
    );
  }

  // Totals
  children.push(heading("Totals"));
  const totalRows: string[][] = [
    ["Measure", "Value"],
    ["Actual hours", formatHours(totals.actual_total)],
    ["Current estimate", formatHours(totals.current_total)],
    ["Original estimate", formatHours(totals.original_total)],
  ];
  if (discountHours > 0) {
    totalRows.push(["Discounts applied", `−${formatHours(discountHours)}`]);
    totalRows.push(["Billable hours", formatHours(effectiveActual)]);
  }
  if (showRate) {
    totalRows.push(["Rate", `${formatGBP(rate)} per hour`]);
    totalRows.push(["Total cost to date", formatGBP(effectiveActual * rate)]);
  }
  children.push(table([4026, 5000], totalRows, { rightFrom: 1 }));

  if (publicUrl) {
    children.push(
      new Paragraph({
        spacing: { before: 300 },
        children: [text(`Live timeline and detail: ${publicUrl}`, { color: MUTED })],
      }),
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 20, color: INK } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 40, bold: true, color: NAVY, font: "Arial" },
          paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: NAVY, font: "Arial" },
          paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  text(
                    `Generated ${format(new Date(), "d MMMM yyyy")} · ${project.name} · Page `,
                    { color: MUTED, size: 16 },
                  ),
                  new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function reportFileName(acronym: string, cutoff: string) {
  return `${acronym || "project"}-client-report-${format(new Date(cutoff), "yyyy-MM-dd")}.docx`;
}

/** Ensure the layout constant stays consistent with the table widths above. */
export const REPORT_CONTENT_WIDTH = CONTENT_WIDTH;
