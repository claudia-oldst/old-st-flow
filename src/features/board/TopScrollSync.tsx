import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps a horizontally-scrolling region and adds a second scrollbar
 * that sits ABOVE the content and stays sticky at the top of the
 * viewport so the user can always move across columns without
 * scrolling to the bottom of the board.
 */
export function TopScrollSync({ children }: { children: ReactNode }) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Keep the dummy inner width in sync with actual content width.
  useEffect(() => {
    const bottom = bottomRef.current;
    const inner = topInnerRef.current;
    if (!bottom || !inner) return;
    const update = () => {
      inner.style.width = `${bottom.scrollWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bottom);
    Array.from(bottom.children).forEach((c) => ro.observe(c as Element));
    return () => ro.disconnect();
  }, []);

  // Sync scroll positions both ways.
  useEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) return;
    let lock = false;
    const onTop = () => {
      if (lock) return;
      lock = true;
      bottom.scrollLeft = top.scrollLeft;
      lock = false;
    };
    const onBottom = () => {
      if (lock) return;
      lock = true;
      top.scrollLeft = bottom.scrollLeft;
      lock = false;
    };
    top.addEventListener("scroll", onTop, { passive: true });
    bottom.addEventListener("scroll", onBottom, { passive: true });
    return () => {
      top.removeEventListener("scroll", onTop);
      bottom.removeEventListener("scroll", onBottom);
    };
  }, []);

  return (
    <>
      <div
        ref={topRef}
        className="sticky top-0 z-30 overflow-x-auto overflow-y-hidden bg-background/80 backdrop-blur-sm -mx-1 px-1 mb-2"
        style={{ height: 14 }}
        aria-hidden
      >
        <div ref={topInnerRef} style={{ height: 1 }} />
      </div>
      <div ref={bottomRef} className="flex gap-3 overflow-x-auto pb-4">
        {children}
      </div>
    </>
  );
}
