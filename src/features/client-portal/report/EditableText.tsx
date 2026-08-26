import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline-editable block for the client report. Edits live in the page only —
 * they exist so the PMBA can tidy the copy before printing to PDF, and are
 * never written back to the portal.
 */
export function EditableText({
  value,
  placeholder,
  className,
  as: Tag = "div",
}: {
  value: string;
  placeholder?: string;
  className?: string;
  as?: "div" | "h1" | "p";
}) {
  const ref = useRef<HTMLElement | null>(null);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onPaste={(e: React.ClipboardEvent) => {
        // Keep pasted copy plain so the printed document stays consistent.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      className={cn("whitespace-pre-wrap", className)}
    >
      {value}
    </Tag>
  );
}

export function ReportSection({
  title,
  children,
  breakBefore,
  right,
}: {
  title: string;
  children: ReactNode;
  breakBefore?: boolean;
  right?: ReactNode;
}) {
  return (
    <section className={cn("report-section space-y-3", breakBefore && "report-break")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wider text-dimmer font-display">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
