import { useMemo, useState } from "react";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { toast } from "@/hooks/use-toast";
import { moveEpic } from "./moveEpic";

const isEpicKey = (k: string) => /^\d+$/.test(k);

/** Drag-and-drop reordering of epic groups (PMBA only). */
export function useEpicGroupDrag(projectId: string | undefined, enabled: boolean) {
  const { epics, reorderEpics } = useProjectEpics(projectId);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const epicOrder = useMemo(() => new Map(epics.map((e, i) => [e.id, i])), [epics]);
  const active = enabled && !!projectId;

  const drop = async (target: string) => {
    const from = dragKey;
    setDragKey(null);
    setOverKey(null);
    if (!from || from === target || !isEpicKey(target)) return;
    const next = moveEpic(epics.map((e) => e.id), Number(from), Number(target));
    if (!(await reorderEpics(next))) {
      toast({ title: "Could not reorder epics", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleProps = (key: string) =>
    active && isEpicKey(key)
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = "move";
            setDragKey(key);
          },
          onDragEnd: () => {
            setDragKey(null);
            setOverKey(null);
          },
        }
      : null;

  const dropProps = (key: string) =>
    active && dragKey && isEpicKey(key)
      ? {
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            if (overKey !== key) setOverKey(key);
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            void drop(key);
          },
        }
      : {};

  return { epicOrder: projectId ? epicOrder : undefined, dragKey, overKey, handleProps, dropProps };
}
