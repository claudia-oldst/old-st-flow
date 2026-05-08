import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { Project } from "@/lib/types";
import { PAGE_SIZES } from "@/lib/pagination";

export type StatusFilter = "active" | "vaulted" | "all";
export type SortKey = "newest" | "oldest" | "name" | "archived";

export function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function useProjectsList(args: {
  page: number;
  status: StatusFilter;
  sort: SortKey;
  debouncedQ: string;
}) {
  const { page, status, sort, debouncedQ } = args;
  const pageSize = PAGE_SIZES.projects;
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, { tickets: number; members: number }>>({});

  const load = useCallback(async () => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("projects").select("*", { count: "exact" });
    if (status === "active") query = query.eq("is_archived", false);
    else if (status === "vaulted") query = query.eq("is_archived", true);

    const term = debouncedQ.trim();
    if (term) {
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},acronym.ilike.${like},client_name.ilike.${like}`);
    }

    switch (sort) {
      case "oldest": query = query.order("created_at", { ascending: true }); break;
      case "name": query = query.order("name", { ascending: true }); break;
      case "archived": query = query.order("archived_at", { ascending: false, nullsFirst: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    const { data, count } = await query.range(from, to);
    setProjects(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);

    if (data && data.length) {
      const entries = await Promise.all(
        data.map(async (p) => {
          if (p.is_archived) return [p.id, { tickets: 0, members: 0 }] as const;
          const [{ count: tCount }, { count: mCount }] = await Promise.all([
            supabase.from("tickets").select("id", { count: "exact", head: true }).eq("project_id", p.id),
            supabase.from("project_members").select("user_id", { count: "exact", head: true }).eq("project_id", p.id),
          ]);
          return [p.id, { tickets: tCount ?? 0, members: mCount ?? 0 }] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    } else {
      setCounts({});
    }
  }, [page, pageSize, status, sort, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  useRealtimeReload(
    [{ table: "projects" }, { table: "tickets" }, { table: "project_members" }],
    load,
  );

  return { projects, total, loading, counts, pageSize, reload: load };
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
