import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { useCurrentUser } from "@/store/currentUser";
import type { EpicDiscount, Discipline } from "./applyDiscounts";

export interface CreateDiscountInput {
  epic_id: number;
  discipline: Discipline;
  hours: number;
  reason: string;
}

export function useEpicDiscounts(projectId: string | undefined) {
  const qc = useQueryClient();
  const user = useCurrentUser((s) => s.user);
  const queryKey = ["epicDiscounts", projectId] as const;

  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: async (): Promise<EpicDiscount[]> => {
      const { data, error } = await supabase
        .from("epic_discounts")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        hours: Number(d.hours),
      })) as EpicDiscount[];
    },
  });

  useRealtimeInvalidate(
    projectId ? [{ table: "epic_discounts", filter: `project_id=eq.${projectId}` }] : null,
    queryKey,
    !!projectId,
  );

  const invalidateRelated = useCallback(() => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["clientPortal"] });
    qc.invalidateQueries({ queryKey: ["projectPortalPreview"] });
  }, [qc, queryKey]);

  const createMany = useMutation({
    mutationFn: async (rows: CreateDiscountInput[]) => {
      if (!projectId) throw new Error("Missing project");
      if (rows.length === 0) return [];
      const payload = rows.map((r) => ({
        project_id: projectId,
        epic_id: r.epic_id,
        discipline: r.discipline,
        hours: r.hours,
        reason: r.reason.trim(),
        created_by: user?.id ?? null,
      }));
      const { data, error } = await supabase
        .from("epic_discounts")
        .insert(payload as any)
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (rows) => {
      invalidateRelated();
      toast.success(`Created ${rows.length} discount${rows.length === 1 ? "" : "s"}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create discounts"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CreateDiscountInput> }) => {
      const { error } = await supabase.from("epic_discounts").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRelated();
      toast.success("Discount updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("epic_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRelated();
      toast.success("Discount removed");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to remove"),
  });

  return {
    discounts: query.data ?? [],
    loading: query.isPending && !!projectId,
    createMany: createMany.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    busy: createMany.isPending || update.isPending || remove.isPending,
  };
}
