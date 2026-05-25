import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps a horizontally-scrolling region. The optional `toolbar` and a
 * synced horizontal scrollbar are rendered inside a single sticky header
 * that sits just below the app's top bar, so the user can always switch
 * modes, filter and pan across columns from anywhere on the board.
 */
export function TopScrollSync({
  children,
  toolbar,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
}) {
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
      <div className="sticky top-[68px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-2 bg-background/85 backdrop-blur-md hairline-b">
        {toolbar}
        <div
          ref={topRef}
          className="overflow-x-auto overflow-y-hidden mt-1"
          style={{ height: 14 }}
          aria-hidden
        >
          <div ref={topInnerRef} style={{ height: 1 }} />
        </div>
      </div>
      <div ref={bottomRef} className="flex gap-3 overflow-x-auto pb-4 pt-2">
        {children}
      </div>
    </>
  );
}
