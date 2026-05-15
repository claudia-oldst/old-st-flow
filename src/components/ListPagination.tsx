import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

/**
 * Compact, accessible pagination control. Shows up to 5 numbered pages with
 * ellipses, plus Prev/Next. Hides itself when total fits on one page.
 */
export function ListPagination({ page, total, pageSize, onChange, className }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const next = Math.min(totalPages, Math.max(1, p));
    if (next !== page) onChange(next);
  };

  const subtleLink = "h-7 min-w-7 px-2 text-[11px] rounded-md border-0 bg-transparent hover:bg-transparent hover:text-foreground text-dimmer";
  const activeLink = "text-foreground font-medium";

  return (
    <Pagination className={className}>
      <PaginationContent className="gap-0.5">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={go(page - 1)}
            aria-disabled={page <= 1}
            size="sm"
            className={cn(subtleLink, "gap-1 px-2", page <= 1 && "pointer-events-none opacity-30")}
          />
        </PaginationItem>
        {pages.map((p, i) =>
          p === "…" ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis className="h-7 w-7 text-dimmer" />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={go(p)}
                size="sm"
                className={cn(subtleLink, p === page && activeLink)}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={go(page + 1)}
            aria-disabled={page >= totalPages}
            size="sm"
            className={cn(subtleLink, "gap-1 px-2", page >= totalPages && "pointer-events-none opacity-30")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
