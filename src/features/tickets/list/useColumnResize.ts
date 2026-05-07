import { useCallback, useEffect, useRef, useState } from "react";
import { COLS, ColKey, STORAGE_KEY, loadWidths } from "./columns";

export function useColumnResize(visibleCols: ColKey[]) {
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>(() => loadWidths());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      /* ignore */
    }
  }, [widths]);

  const widthFor = (k: ColKey) => widths[k] ?? COLS[k].default;
  const totalWidth = visibleCols.reduce((sum, k) => sum + widthFor(k), 0);

  const dragRef = useRef<{ key: ColKey; startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback(
    (key: ColKey) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        key,
        startX: e.clientX,
        startWidth: widthFor(key),
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const next = Math.max(COLS[d.key].min, d.startWidth + (ev.clientX - d.startX));
        setWidths((w) => ({ ...w, [d.key]: next }));
      };
      const onUp = () => {
        dragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widths]
  );

  return { widths, widthFor, totalWidth, onResizeStart };
}
